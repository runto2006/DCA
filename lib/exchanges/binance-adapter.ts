import { 
  BaseExchange, 
  ExchangeConfig, 
  ExchangeStatus,
  ExchangeInterface,
  OrderRequest,
  OrderResult,
  Kline,
  Ticker24hr,
  Balance,
  AccountInfo,
  Order,
  Trade
} from './base'
import crypto from 'crypto'

export class BinanceAdapter extends BaseExchange implements ExchangeInterface {
  name = 'Binance'
  isActive = true
  
  private baseUrl: string
  
  constructor(config: ExchangeConfig) {
    super(config)
    this.baseUrl = config.sandbox 
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3'
  }
  
  // 生成签名
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(queryString)
      .digest('hex')
  }
  
  // 创建带认证的请求
  private async authenticatedRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now()
    const recvWindow = 60000
    
    const queryParams = {
      ...params,
      timestamp,
      recvWindow
    }
    
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    
    const signature = this.generateSignature(queryString)
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Binance API错误: ${response.status} - ${errorText}`)
    }
    
    return response.json()
  }
  
  // 创建POST请求
  private async authenticatedPostRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now()
    const recvWindow = 60000
    
    const queryParams = {
      ...params,
      timestamp,
      recvWindow
    }
    
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    
    const signature = this.generateSignature(queryString)
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': this.config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `${queryString}&signature=${signature}`
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Binance API错误: ${response.status} - ${errorText}`)
    }
    
    return response.json()
  }
  
  // 获取价格
  async getPrice(symbol: string): Promise<number> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const normalizedSymbol = this.normalizeSymbol(symbol)
        const url = `${this.baseUrl}/ticker/price?symbol=${normalizedSymbol}`
        console.log(`🔍 Binance 调试: 第${attempt}次尝试, URL=${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(15000) // 15秒超时
        })
        
        console.log(`🔍 Binance 调试: 响应状态=${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ Binance 调试: HTTP错误=${response.status}, 响应=${errorText}`)
          throw new Error(`获取价格失败: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`🔍 Binance 调试: 成功获取价格数据`)
        
        const price = parseFloat(data.price)
        console.log(`✅ Binance 调试: 成功获取价格 ${price} for ${normalizedSymbol}`)
        return price
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Binance 调试: 第${attempt}次尝试失败: ${error}`);
        
        if (attempt < maxRetries) {
          // 等待一段时间后重试
          const delay = Math.min(1000 * attempt, 5000); // 递增延迟，最大5秒
          console.log(`⏳ Binance 调试: 等待${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败了
    console.log(`❌ Binance 调试: 所有${maxRetries}次尝试都失败了`);
    this.handleError(lastError, '获取价格')
  }
  
  // 获取K线数据
  async getKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await fetch(
        `${this.baseUrl}/klines?symbol=${normalizedSymbol}&interval=${interval}&limit=${limit}`
      )
      
      if (!response.ok) {
        throw new Error(`获取K线数据失败: ${response.status}`)
      }
      
      const data = await response.json()
      return data.map((kline: any[]) => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteAssetVolume: parseFloat(kline[7]),
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: parseFloat(kline[9]),
        takerBuyQuoteAssetVolume: parseFloat(kline[10])
      }))
    } catch (error) {
      this.handleError(error, '获取K线数据')
    }
  }
  
  // 获取24小时行情
  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${normalizedSymbol}`)
      
      if (!response.ok) {
        throw new Error(`获取24小时行情失败: ${response.status}`)
      }
      
      const data = await response.json()
      return {
        symbol: data.symbol,
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        weightedAvgPrice: parseFloat(data.weightedAvgPrice),
        prevClosePrice: parseFloat(data.prevClosePrice),
        lastPrice: parseFloat(data.lastPrice),
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
        openTime: data.openTime,
        closeTime: data.closeTime,
        firstId: data.firstId,
        lastId: data.lastId,
        count: data.count
      }
    } catch (error) {
      this.handleError(error, '获取24小时行情')
    }
  }
  
  // 获取余额
  async getBalance(symbol: string): Promise<Balance> {
    try {
      const accountInfo = await this.getAccountInfo()
      const asset = symbol.replace('USDT', '')
      const balance = accountInfo.balances.find(b => b.asset === asset)
      
      if (!balance) {
        return {
          asset,
          free: 0,
          locked: 0,
          total: 0
        }
      }
      
      return balance
    } catch (error) {
      this.handleError(error, '获取余额')
    }
  }
  
  // 获取所有余额
  async getAllBalances(): Promise<Balance[]> {
    try {
      const accountInfo = await this.getAccountInfo()
      return accountInfo.balances.filter(b => b.total > 0)
    } catch (error) {
      this.handleError(error, '获取所有余额')
    }
  }
  
  // 获取账户信息
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const data = await this.authenticatedRequest('/account')
      return {
        makerCommission: data.makerCommission,
        takerCommission: data.takerCommission,
        buyerCommission: data.buyerCommission,
        sellerCommission: data.sellerCommission,
        canTrade: data.canTrade,
        canWithdraw: data.canWithdraw,
        canDeposit: data.canDeposit,
        updateTime: data.updateTime,
        accountType: data.accountType,
        balances: data.balances.map((b: any) => ({
          asset: b.asset,
          free: parseFloat(b.free),
          locked: parseFloat(b.locked),
          total: parseFloat(b.total)
        }))
      }
    } catch (error) {
      this.handleError(error, '获取账户信息')
    }
  }
  
  // 下单
  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      const normalizedSymbol = this.normalizeSymbol(order.symbol)
      
      const params: Record<string, any> = {
        symbol: normalizedSymbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity.toString()
      }
      
      if (order.price) {
        params.price = order.price.toString()
      }
      
      if (order.timeInForce) {
        params.timeInForce = order.timeInForce
      }
      
      const data = await this.authenticatedPostRequest('/order', params)
      
      return {
        orderId: data.orderId.toString(),
        symbol: data.symbol,
        side: data.side,
        type: data.type,
        status: this.mapOrderStatus(data.status),
        quantity: parseFloat(data.origQty),
        price: parseFloat(data.price),
        executedQuantity: parseFloat(data.executedQty),
        averagePrice: parseFloat(data.avgPrice || '0'),
        timestamp: new Date(data.time),
        exchange: this.name
      }
    } catch (error) {
      this.handleError(error, '下单')
    }
  }
  
  // 取消订单
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      await this.authenticatedPostRequest('/order', {
        symbol: normalizedSymbol,
        orderId: orderId
      })
      return true
    } catch (error) {
      this.handleError(error, '取消订单')
    }
  }
  
  // 获取订单
  async getOrder(symbol: string, orderId: string): Promise<Order> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const data = await this.authenticatedRequest('/order', {
        symbol: normalizedSymbol,
        orderId: orderId
      })
      
      return {
        orderId: data.orderId.toString(),
        symbol: data.symbol,
        side: data.side,
        type: data.type,
        status: data.status,
        quantity: parseFloat(data.origQty),
        price: parseFloat(data.price),
        executedQuantity: parseFloat(data.executedQty),
        averagePrice: parseFloat(data.avgPrice || '0'),
        timestamp: new Date(data.time),
        updateTime: new Date(data.updateTime)
      }
    } catch (error) {
      this.handleError(error, '获取订单')
    }
  }
  
  // 获取未成交订单
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      const params: Record<string, any> = {}
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }
      
      const data = await this.authenticatedRequest('/openOrders', params)
      
      return data.map((order: any) => ({
        orderId: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price),
        executedQuantity: parseFloat(order.executedQty),
        averagePrice: parseFloat(order.avgPrice || '0'),
        timestamp: new Date(order.time),
        updateTime: new Date(order.updateTime)
      }))
    } catch (error) {
      this.handleError(error, '获取未成交订单')
    }
  }
  
  // 获取交易历史
  async getTradeHistory(symbol: string, limit: number = 500): Promise<Trade[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const data = await this.authenticatedRequest('/myTrades', {
        symbol: normalizedSymbol,
        limit: limit
      })
      
      return data.map((trade: any) => ({
        id: trade.id.toString(),
        symbol: trade.symbol,
        side: trade.isBuyer ? 'BUY' : 'SELL',
        quantity: parseFloat(trade.qty),
        price: parseFloat(trade.price),
        quoteQuantity: parseFloat(trade.quoteQty),
        commission: parseFloat(trade.commission),
        commissionAsset: trade.commissionAsset,
        timestamp: new Date(trade.time)
      }))
    } catch (error) {
      this.handleError(error, '获取交易历史')
    }
  }
  
  // 获取订单历史
  async getOrderHistory(symbol: string, limit: number = 500): Promise<Order[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const data = await this.authenticatedRequest('/allOrders', {
        symbol: normalizedSymbol,
        limit: limit
      })
      
      return data.map((order: any) => ({
        orderId: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price),
        executedQuantity: parseFloat(order.executedQty),
        averagePrice: parseFloat(order.avgPrice || '0'),
        timestamp: new Date(order.time),
        updateTime: new Date(order.updateTime)
      }))
    } catch (error) {
      this.handleError(error, '获取订单历史')
    }
  }
  
  // 映射订单状态
  private mapOrderStatus(binanceStatus: string): 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' {
    switch (binanceStatus) {
      case 'NEW':
      case 'PARTIALLY_FILLED':
        return 'PENDING'
      case 'FILLED':
        return 'FILLED'
      case 'CANCELED':
      case 'EXPIRED':
        return 'CANCELLED'
      case 'REJECTED':
        return 'REJECTED'
      default:
        return 'PENDING'
    }
  }
} 