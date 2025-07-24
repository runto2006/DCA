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

export class BybitAdapter implements ExchangeInterface {
  name: string = 'bybit'
  isActive: boolean = false
  private config: ExchangeConfig
  private status: ExchangeStatus = ExchangeStatus.INACTIVE
  private baseUrl: string = 'https://api.bybit.com'

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
      const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=spot&symbol=BTCUSDT`)
      if (!response.ok) {
        throw new Error(`Bybit API连接失败: ${response.status}`)
      }
    } catch (error) {
      throw new Error(`Bybit连接测试失败: ${error}`)
    }
  }

  private generateSignature(params: string, timestamp: number): string {
    const queryString = `timestamp=${timestamp}&${params}`
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(queryString)
      .digest('hex')
  }

  private async makeRequest(endpoint: string, method: string = 'GET', params: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const timestamp = Date.now()

    let requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': this.config.apiKey,
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-RECV-WINDOW': '5000'
      }
    }

    if (method === 'GET') {
      const queryParams = new URLSearchParams(params).toString()
      const signature = this.generateSignature(queryParams, timestamp)
      const fullUrl = `${url}?${queryParams}&sign=${signature}`
      
      const response = await fetch(fullUrl, requestOptions)
      if (!response.ok) {
        throw new ExchangeError(`Bybit ${method} ${endpoint} 失败: ${response.status} - ${await response.text()}`, this.name)
      }
      return await response.json()
    } else {
      const body = JSON.stringify(params)
      const signature = this.generateSignature(body, timestamp)
      requestOptions.headers = {
        ...requestOptions.headers,
        'X-BAPI-SIGN': signature
      }
      requestOptions.body = body

      const response = await fetch(url, requestOptions)
      if (!response.ok) {
        throw new ExchangeError(`Bybit ${method} ${endpoint} 失败: ${response.status} - ${await response.text()}`, this.name)
      }
      return await response.json()
    }
  }

  async getPrice(symbol: string): Promise<number> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/market/tickers', 'GET', {
        category: 'spot',
        symbol: normalizedSymbol
      })

      if (response.retCode !== 0 || !response.result.list || response.result.list.length === 0) {
        throw new ExchangeError(`Bybit获取价格失败: ${response.retMsg}`, this.name)
      }

      const ticker = response.result.list[0]
      return parseFloat(ticker.lastPrice)
    } catch (error) {
      throw new ExchangeError(`Bybit获取价格 ${symbol} 失败: ${error}`, this.name)
    }
  }

  async getKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/market/kline', 'GET', {
        category: 'spot',
        symbol: normalizedSymbol,
        interval: interval,
        limit: limit
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取K线失败: ${response.retMsg}`, this.name)
      }

      return response.result.list.map((item: any) => ({
        openTime: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        closeTime: parseInt(item[6]),
        quoteAssetVolume: parseFloat(item[7]),
        numberOfTrades: parseInt(item[8]),
        takerBuyBaseAssetVolume: parseFloat(item[9]),
        takerBuyQuoteAssetVolume: parseFloat(item[10])
      }))
    } catch (error) {
      throw new ExchangeError(`Bybit获取K线 ${symbol} 失败: ${error}`, this.name)
    }
  }

  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/market/tickers', 'GET', {
        category: 'spot',
        symbol: normalizedSymbol
      })

      if (response.retCode !== 0 || !response.result.list || response.result.list.length === 0) {
        throw new ExchangeError(`Bybit获取24小时行情失败: ${response.retMsg}`, this.name)
      }

      const ticker = response.result.list[0]
      return {
        symbol: symbol,
        priceChange: parseFloat(ticker.price24hPcnt) * parseFloat(ticker.lastPrice),
        priceChangePercent: parseFloat(ticker.price24hPcnt) * 100,
        weightedAvgPrice: parseFloat(ticker.vwap24h),
        prevClosePrice: parseFloat(ticker.prevPrice24h),
        lastPrice: parseFloat(ticker.lastPrice),
        lastQty: parseFloat(ticker.lastTickDirection),
        bidPrice: parseFloat(ticker.bid1Price),
        bidQty: parseFloat(ticker.bid1Size),
        askPrice: parseFloat(ticker.ask1Price),
        askQty: parseFloat(ticker.ask1Size),
        openPrice: parseFloat(ticker.openPrice24h),
        highPrice: parseFloat(ticker.highPrice24h),
        lowPrice: parseFloat(ticker.lowPrice24h),
        volume: parseFloat(ticker.volume24h),
        quoteVolume: parseFloat(ticker.turnover24h),
        openTime: 0,
        closeTime: 0,
        firstId: 0,
        lastId: 0,
        count: 0
      }
    } catch (error) {
      throw new ExchangeError(`Bybit获取24小时行情 ${symbol} 失败: ${error}`, this.name)
    }
  }

  async getBalance(symbol: string): Promise<Balance> {
    try {
      const response = await this.makeRequest('/v5/account/wallet-balance', 'GET', {
        accountType: 'UNIFIED'
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取余额失败: ${response.retMsg}`, this.name)
      }

      const balances = response.result.list[0].coin || []
      const targetBalance = balances.find((b: any) => b.coin === symbol)

      return {
        asset: symbol,
        free: targetBalance ? parseFloat(targetBalance.walletBalance) : 0,
        locked: targetBalance ? parseFloat(targetBalance.orderMargin) : 0,
        total: targetBalance ? parseFloat(targetBalance.walletBalance) : 0
      }
    } catch (error) {
      throw new ExchangeError(`Bybit获取余额 ${symbol} 失败: ${error}`, this.name)
    }
  }

  async getAllBalances(): Promise<Balance[]> {
    try {
      const response = await this.makeRequest('/v5/account/wallet-balance', 'GET', {
        accountType: 'UNIFIED'
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取所有余额失败: ${response.retMsg}`, this.name)
      }

      const balances = response.result.list[0].coin || []
      return balances.map((b: any) => ({
        asset: b.coin,
        free: parseFloat(b.walletBalance),
        locked: parseFloat(b.orderMargin),
        total: parseFloat(b.walletBalance)
      }))
    } catch (error) {
      throw new ExchangeError(`Bybit获取所有余额失败: ${error}`, this.name)
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response = await this.makeRequest('/v5/account/wallet-balance', 'GET', {
        accountType: 'UNIFIED'
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取账户信息失败: ${response.retMsg}`, this.name)
      }

      const account = response.result.list[0]
      return {
        makerCommission: 0.001,
        takerCommission: 0.001,
        buyerCommission: 0.001,
        sellerCommission: 0.001,
        canTrade: true,
        canWithdraw: true,
        canDeposit: true,
        updateTime: Date.now(),
        accountType: account.accountType,
        balances: await this.getAllBalances()
      }
    } catch (error) {
      throw new ExchangeError(`Bybit获取账户信息失败: ${error}`, this.name)
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      const normalizedSymbol = this.normalizeSymbol(order.symbol)
      const orderParams: any = {
        category: 'spot',
        symbol: normalizedSymbol,
        side: order.side,
        orderType: order.type,
        qty: order.quantity.toString()
      }

      if (order.price) {
        orderParams.price = order.price.toString()
      }

      if (order.timeInForce) {
        orderParams.timeInForce = order.timeInForce
      }

      const response = await this.makeRequest('/v5/order/create', 'POST', orderParams)

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit下单失败: ${response.retMsg}`, this.name)
      }

      const orderResult = response.result
      return {
        orderId: orderResult.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: this.mapOrderStatus(orderResult.orderStatus),
        quantity: order.quantity,
        price: order.price || 0,
        executedQuantity: 0,
        averagePrice: 0,
        timestamp: new Date(),
        exchange: this.name
      }
    } catch (error) {
      throw new ExchangeError(`Bybit下单 ${order.symbol} 失败: ${error}`, this.name)
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/order/cancel', 'POST', {
        category: 'spot',
        symbol: normalizedSymbol,
        orderId: orderId
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit取消订单失败: ${response.retMsg}`, this.name)
      }

      return true
    } catch (error) {
      throw new ExchangeError(`Bybit取消订单 ${orderId} 失败: ${error}`, this.name)
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/order/realtime', 'GET', {
        category: 'spot',
        symbol: normalizedSymbol,
        orderId: orderId
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取订单失败: ${response.retMsg}`, this.name)
      }

      const order = response.result.list[0]
      return {
        orderId: order.orderId,
        symbol: symbol,
        side: order.side,
        type: order.orderType,
        status: order.orderStatus,
        quantity: parseFloat(order.qty),
        price: parseFloat(order.price),
        executedQuantity: parseFloat(order.cumExecQty),
        averagePrice: parseFloat(order.avgPrice),
        timestamp: new Date(parseInt(order.createdTime)),
        updateTime: new Date(parseInt(order.updatedTime))
      }
    } catch (error) {
      throw new ExchangeError(`Bybit获取订单 ${orderId} 失败: ${error}`, this.name)
    }
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      const params: any = {
        category: 'spot'
      }
      
      if (symbol) {
        params.symbol = this.normalizeSymbol(symbol)
      }

      const response = await this.makeRequest('/v5/order/realtime', 'GET', params)

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取未成交订单失败: ${response.retMsg}`, this.name)
      }

      return response.result.list.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.orderType,
        status: order.orderStatus,
        quantity: parseFloat(order.qty),
        price: parseFloat(order.price),
        executedQuantity: parseFloat(order.cumExecQty),
        averagePrice: parseFloat(order.avgPrice),
        timestamp: new Date(parseInt(order.createdTime)),
        updateTime: new Date(parseInt(order.updatedTime))
      }))
    } catch (error) {
      throw new ExchangeError(`Bybit获取未成交订单失败: ${error}`, this.name)
    }
  }

  async getTradeHistory(symbol: string, limit: number = 100): Promise<Trade[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/execution/list', 'GET', {
        category: 'spot',
        symbol: normalizedSymbol,
        limit: limit
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取交易历史失败: ${response.retMsg}`, this.name)
      }

      return response.result.list.map((trade: any) => ({
        id: trade.execId,
        symbol: trade.symbol,
        side: trade.side,
        quantity: parseFloat(trade.execQty),
        price: parseFloat(trade.execPrice),
        quoteQuantity: parseFloat(trade.execValue),
        commission: parseFloat(trade.execFee),
        commissionAsset: trade.feeRate,
        timestamp: new Date(parseInt(trade.execTime))
      }))
    } catch (error) {
      throw new ExchangeError(`Bybit获取交易历史 ${symbol} 失败: ${error}`, this.name)
    }
  }

  async getOrderHistory(symbol: string, limit: number = 100): Promise<Order[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.makeRequest('/v5/order/history', 'GET', {
        category: 'spot',
        symbol: normalizedSymbol,
        limit: limit
      })

      if (response.retCode !== 0) {
        throw new ExchangeError(`Bybit获取订单历史失败: ${response.retMsg}`, this.name)
      }

      return response.result.list.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.orderType,
        status: order.orderStatus,
        quantity: parseFloat(order.qty),
        price: parseFloat(order.price),
        executedQuantity: parseFloat(order.cumExecQty),
        averagePrice: parseFloat(order.avgPrice),
        timestamp: new Date(parseInt(order.createdTime)),
        updateTime: new Date(parseInt(order.updatedTime))
      }))
    } catch (error) {
      throw new ExchangeError(`Bybit获取订单历史 ${symbol} 失败: ${error}`, this.name)
    }
  }

  private mapOrderStatus(bybitStatus: string): 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' {
    const statusMap: { [key: string]: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' } = {
      'Created': 'PENDING',
      'New': 'PENDING',
      'PartiallyFilled': 'PENDING',
      'Filled': 'FILLED',
      'Cancelled': 'CANCELLED',
      'Rejected': 'REJECTED',
      'PendingCancel': 'PENDING'
    }
    return statusMap[bybitStatus] || 'PENDING'
  }

  private normalizeSymbol(symbol: string): string {
    // Bybit使用标准格式，如BTCUSDT, SOLUSDT
    return symbol.toUpperCase()
  }
} 