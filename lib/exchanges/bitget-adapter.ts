import { 
  ExchangeInterface, 
  ExchangeStatus, 
  ExchangeConfig, 
  OrderResult, 
  Balance, 
  OrderRequest,
  Kline,
  Ticker24hr,
  AccountInfo,
  Order,
  Trade,
  ExchangeError
} from './base'
import crypto from 'crypto'

export class BitgetAdapter implements ExchangeInterface {
  name: string = 'bitget'
  isActive: boolean = false
  private config: ExchangeConfig
  private status: ExchangeStatus = ExchangeStatus.INACTIVE
  private baseUrl: string = 'https://api.bitget.com'

  constructor(config: ExchangeConfig) {
    this.config = config
  }

  getStatus(): ExchangeStatus {
    return this.status
  }

  setStatus(status: ExchangeStatus): void {
    this.status = status
    this.isActive = status === ExchangeStatus.ACTIVE
  }

  async initialize(): Promise<void> {
    try {
      // 测试连接
      await this.testConnection()
      this.setStatus(ExchangeStatus.ACTIVE)
      console.log(`✅ ${this.name} 交易所初始化成功`)
    } catch (error) {
      this.setStatus(ExchangeStatus.ERROR)
      console.error(`❌ ${this.name} 交易所初始化失败:`, error)
      throw error
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/spot/v1/market/ticker?symbol=BTCUSDT`)
      if (!response.ok) {
        throw new Error(`Bitget API连接失败: ${response.status}`)
      }
    } catch (error) {
      throw new Error(`Bitget连接测试失败: ${error}`)
    }
  }

  private generateSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    const message = timestamp + method + requestPath + body
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(message)
      .digest('base64')
  }

  private async makeRequest(endpoint: string, method: string = 'GET', params: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const timestamp = Date.now().toString()
    const body = method === 'POST' ? JSON.stringify(params) : ''

    let requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'ACCESS-KEY': this.config.apiKey,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-SIGN': this.generateSignature(timestamp, method, endpoint, body),
        'ACCESS-PASSPHRASE': this.config.passphrase || ''
      }
    }

    if (method === 'GET') {
      const queryParams = new URLSearchParams(params).toString()
      const fullUrl = queryParams ? `${url}?${queryParams}` : url
      
      const response = await fetch(fullUrl, requestOptions)
      if (!response.ok) {
        throw new ExchangeError(`Bitget ${method} ${endpoint} 失败: ${response.status} - ${await response.text()}`, this.name)
      }
      return await response.json()
    } else {
      requestOptions.body = body
      
      const response = await fetch(url, requestOptions)
      if (!response.ok) {
        throw new ExchangeError(`Bitget ${method} ${endpoint} 失败: ${response.status} - ${await response.text()}`, this.name)
      }
      return await response.json()
    }
  }

  async getPrice(symbol: string): Promise<number> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const normalizedSymbol = this.normalizeSymbol(symbol)
        const url = `${this.baseUrl}/api/spot/v1/market/ticker?symbol=${normalizedSymbol}`
        console.log(`🔍 Bitget 调试: 第${attempt}次尝试, URL=${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(15000) // 15秒超时
        })
        
        console.log(`🔍 Bitget 调试: 响应状态=${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ Bitget 调试: HTTP错误=${response.status}, 响应=${errorText}`)
          throw new Error(`Bitget API错误: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`🔍 Bitget 调试: 响应代码=${data.code}, 数据=${data.data ? '存在' : '不存在'}`)
        
        if (data.code !== '00000') {
          console.log(`❌ Bitget 调试: 业务错误=${data.msg}`)
          throw new Error(`Bitget业务错误: ${data.msg}`)
        }
        
        if (!data.data || !data.data.last) {
          console.log(`❌ Bitget 调试: 未找到价格数据`)
          throw new Error(`Bitget 获取价格失败: 无效响应`)
        }
        
        const price = parseFloat(data.data.last)
        console.log(`✅ Bitget 调试: 成功获取价格 ${price} for ${normalizedSymbol}`)
        return price
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Bitget 调试: 第${attempt}次尝试失败: ${error}`);
        
        if (attempt < maxRetries) {
          // 等待一段时间后重试
          const delay = Math.min(1000 * attempt, 5000); // 递增延迟，最大5秒
          console.log(`⏳ Bitget 调试: 等待${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败了
    console.log(`❌ Bitget 调试: 所有${maxRetries}次尝试都失败了`);
    throw new ExchangeError(`Bitget 获取价格 ${symbol} 失败: ${lastError}`, this.name)
  }

  async getKlines(symbol: string, interval: string = '1d', limit: number = 100): Promise<Kline[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/api/spot/v1/market/candles', 'GET', {
        symbol: normalizedSymbol,
        period: this.mapInterval(interval),
        limit: limit.toString()
      })
      
      if (!response.data) {
        return []
      }
      
      return response.data.map((item: any) => ({
        openTime: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        closeTime: parseInt(item[0]) + 60000,
        quoteAssetVolume: parseFloat(item[6]),
        numberOfTrades: 0,
        takerBuyBaseAssetVolume: parseFloat(item[5]),
        takerBuyQuoteAssetVolume: parseFloat(item[6])
      }))
    } catch (error) {
      throw new ExchangeError(`Bitget 获取K线数据失败: ${error}`, this.name)
    }
  }

  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/api/spot/v1/market/ticker', 'GET', {
        symbol: normalizedSymbol
      })
      
      if (!response.data) {
        throw new Error(`Bitget 获取24小时统计失败: 无效响应`)
      }
      
      const data = response.data
      return {
        symbol: data.symbol,
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        weightedAvgPrice: parseFloat(data.weightedAvgPrice),
        prevClosePrice: parseFloat(data.prevClosePrice),
        lastPrice: parseFloat(data.last),
        lastQty: parseFloat(data.lastQty),
        bidPrice: parseFloat(data.bidPrice),
        bidQty: parseFloat(data.bidQty),
        askPrice: parseFloat(data.askPrice),
        askQty: parseFloat(data.askQty),
        openPrice: parseFloat(data.openPrice),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume),
        openTime: Date.now() - 24 * 60 * 60 * 1000,
        closeTime: Date.now(),
        firstId: 0,
        lastId: 0,
        count: 0
      }
    } catch (error) {
      throw new ExchangeError(`Bitget 获取24小时统计失败: ${error}`, this.name)
    }
  }

  async getBalance(symbol: string): Promise<Balance> {
    try {
      const response = await this.makeRequest('/api/spot/v1/account/assets', 'GET')
      
      if (!response.data) {
        return {
          asset: symbol,
          free: 0,
          locked: 0,
          total: 0
        }
      }
      
      const balance = response.data.find((item: any) => item.coinId === symbol)
      
      if (!balance) {
        return {
          asset: symbol,
          free: 0,
          locked: 0,
          total: 0
        }
      }
      
      return {
        asset: balance.coinId,
        free: parseFloat(balance.available),
        locked: parseFloat(balance.frozen),
        total: parseFloat(balance.available) + parseFloat(balance.frozen)
      }
    } catch (error) {
      throw new ExchangeError(`Bitget 获取余额失败: ${error}`, this.name)
    }
  }

  async getAllBalances(): Promise<Balance[]> {
    try {
      const response = await this.makeRequest('/api/spot/v1/account/assets', 'GET')
      
      if (!response.data) {
        return []
      }
      
      return response.data
        .filter((item: any) => parseFloat(item.available) > 0 || parseFloat(item.frozen) > 0)
        .map((item: any) => ({
          asset: item.coinId,
          free: parseFloat(item.available),
          locked: parseFloat(item.frozen),
          total: parseFloat(item.available) + parseFloat(item.frozen)
        }))
    } catch (error) {
      throw new ExchangeError(`Bitget 获取所有余额失败: ${error}`, this.name)
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response = await this.makeRequest('/api/spot/v1/account/assets', 'GET')
      
      return {
        makerCommission: 0.1,
        takerCommission: 0.1,
        buyerCommission: 0.1,
        sellerCommission: 0.1,
        canTrade: true,
        canWithdraw: true,
        canDeposit: true,
        updateTime: Date.now(),
        accountType: 'SPOT',
        balances: response.data || []
      }
    } catch (error) {
      throw new ExchangeError(`Bitget 获取账户信息失败: ${error}`, this.name)
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      const normalizedSymbol = this.normalizeSymbol(order.symbol)
      const response = await this.makeRequest('/api/spot/v1/trade/orders', 'POST', {
        symbol: normalizedSymbol,
        side: order.side.toLowerCase(),
        orderType: this.mapOrderType(order.type),
        quantity: order.quantity.toString(),
        price: order.type === 'LIMIT' ? order.price?.toString() : undefined,
        timeInForce: 'GTC'
      })
      
      if (!response.data) {
        throw new Error(`Bitget 下单失败: 无效响应`)
      }
      
      return {
        orderId: response.data.orderId,
        symbol: order.symbol,
        status: this.mapOrderStatus(response.data.status),
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price || 0,
        timestamp: Date.now()
      }
    } catch (error) {
      throw new ExchangeError(`Bitget 下单失败: ${error}`, this.name)
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      await this.makeRequest('/api/spot/v1/trade/cancel-order', 'POST', {
        symbol: normalizedSymbol,
        orderId: orderId
      })
      
      return true
    } catch (error) {
      throw new ExchangeError(`Bitget 取消订单失败: ${error}`, this.name)
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/api/spot/v1/trade/orderInfo', 'GET', {
        symbol: normalizedSymbol,
        orderId: orderId
      })
      
      if (!response.data) {
        throw new Error(`Bitget 获取订单失败: 无效响应`)
      }
      
      const data = response.data
      return {
        orderId: data.orderId,
        symbol: data.symbol,
        status: this.mapOrderStatus(data.status),
        side: data.side.toUpperCase(),
        type: this.mapOrderTypeBack(data.orderType),
        quantity: parseFloat(data.quantity),
        price: parseFloat(data.price),
        executedQty: parseFloat(data.executedQty),
        cummulativeQuoteQty: parseFloat(data.cummulativeQuoteQty),
        timeInForce: data.timeInForce,
        time: parseInt(data.cTime),
        updateTime: parseInt(data.uTime),
        isWorking: data.status === 'NEW' || data.status === 'PARTIALLY_FILLED'
      }
    } catch (error) {
      throw new ExchangeError(`Bitget 获取订单失败: ${error}`, this.name)
    }
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      const params: any = {}
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const response = await this.makeRequest('/api/spot/v1/trade/open-orders', 'GET', params)
      
      if (!response.data) {
        return []
      }
      
      return response.data.map((item: any) => ({
        orderId: item.orderId,
        symbol: item.symbol,
        status: this.mapOrderStatus(item.status),
        side: item.side.toUpperCase(),
        type: this.mapOrderTypeBack(item.orderType),
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        executedQty: parseFloat(item.executedQty),
        cummulativeQuoteQty: parseFloat(item.cummulativeQuoteQty),
        timeInForce: item.timeInForce,
        time: parseInt(item.cTime),
        updateTime: parseInt(item.uTime),
        isWorking: item.status === 'NEW' || item.status === 'PARTIALLY_FILLED'
      }))
    } catch (error) {
      throw new ExchangeError(`Bitget 获取开放订单失败: ${error}`, this.name)
    }
  }

  async getTradeHistory(symbol: string, limit: number = 100): Promise<Trade[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/api/spot/v1/trade/fills', 'GET', {
        symbol: normalizedSymbol,
        limit: limit.toString()
      })
      
      if (!response.data) {
        return []
      }
      
      return response.data.map((item: any) => ({
        id: item.fillId,
        orderId: item.orderId,
        symbol: item.symbol,
        price: parseFloat(item.price),
        qty: parseFloat(item.fillQuantity),
        quoteQty: parseFloat(item.fillQuantity) * parseFloat(item.price),
        commission: parseFloat(item.fee),
        commissionAsset: item.feeCoin,
        time: parseInt(item.cTime),
        isBuyer: item.side === 'BUY',
        isMaker: item.liquidity === 'MAKER'
      }))
    } catch (error) {
      throw new ExchangeError(`Bitget 获取交易历史失败: ${error}`, this.name)
    }
  }

  async getOrderHistory(symbol: string, limit: number = 100): Promise<Order[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/api/spot/v1/trade/history', 'GET', {
        symbol: normalizedSymbol,
        limit: limit.toString()
      })
      
      if (!response.data) {
        return []
      }
      
      return response.data.map((item: any) => ({
        orderId: item.orderId,
        symbol: item.symbol,
        status: this.mapOrderStatus(item.status),
        side: item.side.toUpperCase(),
        type: this.mapOrderTypeBack(item.orderType),
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        executedQty: parseFloat(item.executedQty),
        cummulativeQuoteQty: parseFloat(item.cummulativeQuoteQty),
        timeInForce: item.timeInForce,
        time: parseInt(item.cTime),
        updateTime: parseInt(item.uTime),
        isWorking: false
      }))
    } catch (error) {
      throw new ExchangeError(`