import { BaseExchange, ExchangeInterface, ExchangeConfig, ExchangeError, ExchangeStatus, Kline, Ticker24hr, Balance, AccountInfo, OrderRequest, OrderResult, Order, Trade } from './base'
import crypto from 'crypto'

export class OKXAdapter extends BaseExchange implements ExchangeInterface {
  name = 'OKX'
  isActive = true
  private baseUrl = 'https://www.okx.com'
  private apiUrl = 'https://www.okx.com/api/v5'

  constructor(config: ExchangeConfig) {
    super(config)
    this.setStatus(ExchangeStatus.ACTIVE)
  }

  // 生成签名
  private generateSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    const message = timestamp + method + requestPath + body
    return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('base64')
  }

  // 生成时间戳
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  // 生成Passphrase签名
  private generatePassphrase(): string {
    if (!this.config.passphrase) {
      throw new ExchangeError('OKX需要passphrase', this.name)
    }
    return crypto.createHmac('sha256', this.config.secretKey).update(this.config.passphrase).digest('base64')
  }

  // 认证请求
  private async authenticatedRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const timestamp = this.getTimestamp()
    const requestPath = `/api/v5${endpoint}`
    const bodyString = body ? JSON.stringify(body) : ''
    
    const signature = this.generateSignature(timestamp, method, requestPath, bodyString)
    const passphrase = this.generatePassphrase()

    const headers = {
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase!,
      'Content-Type': 'application/json'
    }

    const url = `${this.apiUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers,
      body: bodyString || undefined
    }

    try {
      const response = await fetch(url, options)
      const data = await response.json()

      if (!response.ok) {
        throw new ExchangeError(`OKX API错误: ${data.msg || response.statusText}`, this.name, data.code?.toString(), response.status)
      }

      if (data.code !== '0') {
        throw new ExchangeError(`OKX业务错误: ${data.msg}`, this.name, data.code)
      }

      return data.data
    } catch (error) {
      this.handleError(error, `${method} ${endpoint}`)
    }
  }

  // 重写符号标准化方法，适配OKX格式
  protected normalizeSymbol(symbol: string): string {
    // OKX使用 SOL-USDT 格式，而不是 SOLUSDT
    if (symbol.includes('USDT')) {
      const base = symbol.replace('USDT', '')
      return `${base}-USDT`
    } else if (symbol.includes('BTC')) {
      const base = symbol.replace('BTC', '')
      return `${base}-BTC`
    } else if (symbol.includes('ETH')) {
      const base = symbol.replace('ETH', '')
      return `${base}-ETH`
    } else {
      // 默认处理
      return `${symbol}-USDT`
    }
  }

  // 获取价格
  async getPrice(symbol: string): Promise<number> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const normalizedSymbol = this.normalizeSymbol(symbol)
        const endpoint = `/market/ticker?instId=${normalizedSymbol}`
        
        // 使用公共API获取价格，不需要身份验证
        const url = `${this.apiUrl}${endpoint}`
        console.log(`🔍 OKX 调试: 第${attempt}次尝试, URL=${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(15000) // 15秒超时
        })
        
        console.log(`🔍 OKX 调试: 响应状态=${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ OKX 调试: HTTP错误=${response.status}, 响应=${errorText}`)
          throw new ExchangeError(`OKX HTTP错误: ${response.status} ${response.statusText}`, this.name, undefined, response.status)
        }
        
        const data = await response.json()
        console.log(`🔍 OKX 调试: 响应代码=${data.code}, 数据长度=${data.data ? data.data.length : 0}`)

        if (data.code !== '0') {
          console.log(`❌ OKX 调试: 业务错误=${data.msg}`)
          throw new ExchangeError(`OKX业务错误: ${data.msg}`, this.name, data.code)
        }

        if (!data.data || data.data.length === 0) {
          console.log(`❌ OKX 调试: 未找到价格数据`)
          throw new ExchangeError(`未找到${normalizedSymbol}的价格数据`, this.name)
        }

        const price = parseFloat(data.data[0].last)
        console.log(`✅ OKX 调试: 成功获取价格 ${price} for ${normalizedSymbol}`)
        return price
        
      } catch (error) {
        lastError = error;
        console.log(`❌ OKX 调试: 第${attempt}次尝试失败: ${error}`);
        
        if (attempt < maxRetries) {
          // 等待一段时间后重试
          const delay = Math.min(1000 * attempt, 5000); // 递增延迟，最大5秒
          console.log(`⏳ OKX 调试: 等待${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败了
    console.log(`❌ OKX 调试: 所有${maxRetries}次尝试都失败了`);
    this.handleError(lastError, `获取价格 ${symbol}`)
  }

  // 获取K线数据
  async getKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const bar = this.mapInterval(interval)
      const endpoint = `/market/candles?instId=${normalizedSymbol}&bar=${bar}&limit=${limit}`
      
      // 使用公共API获取K线数据，不需要身份验证
      const url = `${this.apiUrl}${endpoint}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new ExchangeError(`OKX API错误: ${data.msg || response.statusText}`, this.name, data.code?.toString(), response.status)
      }

      if (data.code !== '0') {
        throw new ExchangeError(`OKX业务错误: ${data.msg}`, this.name, data.code)
      }

      return data.data.map((item: any[]) => ({
        openTime: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        closeTime: parseInt(item[0]) + this.getIntervalMs(interval),
        quoteAssetVolume: parseFloat(item[6]) || 0,
        numberOfTrades: parseInt(item[7]) || 0,
        takerBuyBaseAssetVolume: parseFloat(item[8]) || 0,
        takerBuyQuoteAssetVolume: parseFloat(item[9]) || 0
      }))
    } catch (error) {
      this.handleError(error, `获取K线数据 ${symbol}`)
    }
  }

  // 获取24小时行情
  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const endpoint = `/market/ticker?instId=${normalizedSymbol}`
      
      // 使用公共API获取24小时行情，不需要身份验证
      const url = `${this.apiUrl}${endpoint}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new ExchangeError(`OKX API错误: ${data.msg || response.statusText}`, this.name, data.code?.toString(), response.status)
      }

      if (data.code !== '0') {
        throw new ExchangeError(`OKX业务错误: ${data.msg}`, this.name, data.code)
      }

      if (!data.data || data.data.length === 0) {
        throw new ExchangeError(`未找到${normalizedSymbol}的24小时数据`, this.name)
      }

      const ticker = data.data[0]
      return {
        symbol: normalizedSymbol,
        priceChange: parseFloat(ticker.priceChange24h || '0'),
        priceChangePercent: parseFloat(ticker.priceChangePercent24h || '0'),
        weightedAvgPrice: parseFloat(ticker.weightedAvgPrice24h || '0'),
        prevClosePrice: parseFloat(ticker.prevClosePrice || '0'),
        lastPrice: parseFloat(ticker.last),
        lastQty: parseFloat(ticker.lastQty || '0'),
        bidPrice: parseFloat(ticker.bidPx || '0'),
        bidQty: parseFloat(ticker.bidSz || '0'),
        askPrice: parseFloat(ticker.askPx || '0'),
        askQty: parseFloat(ticker.askSz || '0'),
        openPrice: parseFloat(ticker.open24h || '0'),
        highPrice: parseFloat(ticker.high24h || '0'),
        lowPrice: parseFloat(ticker.low24h || '0'),
        volume: parseFloat(ticker.vol24h || '0'),
        quoteVolume: parseFloat(ticker.volCcy24h || '0'),
        openTime: Date.now() - 24 * 60 * 60 * 1000,
        closeTime: Date.now(),
        firstId: 0,
        lastId: 0,
        count: 0
      }
    } catch (error) {
      this.handleError(error, `获取24小时行情 ${symbol}`)
    }
  }

  // 获取余额
  async getBalance(symbol: string): Promise<Balance> {
    try {
      const balances = await this.getAllBalances()
      const balance = balances.find(b => b.asset === symbol)
      
      if (!balance) {
        return {
          asset: symbol,
          free: 0,
          locked: 0,
          total: 0
        }
      }

      return balance
    } catch (error) {
      this.handleError(error, `获取余额 ${symbol}`)
    }
  }

  // 获取所有余额
  async getAllBalances(): Promise<Balance[]> {
    try {
      const endpoint = '/account/balance'
      const data = await this.authenticatedRequest(endpoint)

      if (!data || data.length === 0) {
        return []
      }

      return data[0].details.map((item: any) => ({
        asset: item.ccy,
        free: parseFloat(item.availBal || '0'),
        locked: parseFloat(item.frozenBal || '0'),
        total: parseFloat(item.cashBal || '0')
      }))
    } catch (error) {
      this.handleError(error, '获取所有余额')
    }
  }

  // 获取账户信息
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const endpoint = '/account/balance'
      const data = await this.authenticatedRequest(endpoint)

      if (!data || data.length === 0) {
        throw new ExchangeError('无法获取账户信息', this.name)
      }

      const account = data[0]
      const balances = await this.getAllBalances()

      return {
        makerCommission: 0.001, // OKX默认费率
        takerCommission: 0.001,
        buyerCommission: 0.001,
        sellerCommission: 0.001,
        canTrade: true,
        canWithdraw: true,
        canDeposit: true,
        updateTime: Date.now(),
        accountType: account.acctId || 'UNIFIED',
        balances
      }
    } catch (error) {
      this.handleError(error, '获取账户信息')
    }
  }

  // 下单
  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      const normalizedSymbol = this.normalizeSymbol(order.symbol)
      const endpoint = '/trade/order'
      
      const orderData = {
        instId: normalizedSymbol,
        tdMode: 'cash',
        side: order.side.toLowerCase(),
        ordType: this.mapOrderType(order.type),
        sz: order.quantity.toString(),
        ...(order.price && { px: order.price.toString() }),
        ...(order.stopPrice && { slTriggerPx: order.stopPrice.toString() })
      }

      const data = await this.authenticatedRequest(endpoint, 'POST', orderData)

      return {
        orderId: data[0].ordId,
        symbol: normalizedSymbol,
        side: order.side,
        type: order.type,
        status: this.mapOrderStatus(data[0].state),
        quantity: order.quantity,
        price: order.price || 0,
        executedQuantity: parseFloat(data[0].accFillSz || '0'),
        averagePrice: parseFloat(data[0].avgPx || '0'),
        timestamp: new Date(),
        exchange: this.name
      }
    } catch (error) {
      this.handleError(error, `下单 ${order.symbol}`)
    }
  }

  // 取消订单
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const endpoint = '/trade/cancel-order'
      
      const data = await this.authenticatedRequest(endpoint, 'POST', {
        instId: normalizedSymbol,
        ordId: orderId
      })

      return data[0].state === 'canceled'
    } catch (error) {
      this.handleError(error, `取消订单 ${symbol} ${orderId}`)
    }
  }

  // 获取订单
  async getOrder(symbol: string, orderId: string): Promise<Order> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const endpoint = `/trade/order?instId=${normalizedSymbol}&ordId=${orderId}`
      const data = await this.authenticatedRequest(endpoint)

      if (!data || data.length === 0) {
        throw new ExchangeError(`未找到订单 ${orderId}`, this.name)
      }

      const order = data[0]
      return {
        orderId: order.ordId,
        symbol: normalizedSymbol,
        side: order.side,
        type: order.ordType,
        status: this.mapOrderStatus(order.state),
        quantity: parseFloat(order.sz),
        price: parseFloat(order.px || '0'),
        executedQuantity: parseFloat(order.accFillSz || '0'),
        averagePrice: parseFloat(order.avgPx || '0'),
        timestamp: new Date(parseInt(order.cTime)),
        updateTime: new Date(parseInt(order.uTime))
      }
    } catch (error) {
      this.handleError(error, `获取订单 ${symbol} ${orderId}`)
    }
  }

  // 获取未完成订单
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      const endpoint = symbol 
        ? `/trade/orders-pending?instId=${this.normalizeSymbol(symbol)}`
        : '/trade/orders-pending'
      
      const data = await this.authenticatedRequest(endpoint)

      return data.map((order: any) => ({
        orderId: order.ordId,
        symbol: order.instId,
        side: order.side,
        type: order.ordType,
        status: this.mapOrderStatus(order.state),
        quantity: parseFloat(order.sz),
        price: parseFloat(order.px || '0'),
        executedQuantity: parseFloat(order.accFillSz || '0'),
        averagePrice: parseFloat(order.avgPx || '0'),
        timestamp: new Date(parseInt(order.cTime)),
        updateTime: new Date(parseInt(order.uTime))
      }))
    } catch (error) {
      this.handleError(error, '获取未完成订单')
    }
  }

  // 获取交易历史
  async getTradeHistory(symbol: string, limit: number = 100): Promise<Trade[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const endpoint = `/trade/trades?instId=${normalizedSymbol}&limit=${limit}`
      const data = await this.authenticatedRequest(endpoint)

      return data.map((trade: any) => ({
        id: trade.tradeId,
        symbol: normalizedSymbol,
        side: trade.side,
        quantity: parseFloat(trade.sz),
        price: parseFloat(trade.px),
        quoteQuantity: parseFloat(trade.sz) * parseFloat(trade.px),
        commission: parseFloat(trade.fee || '0'),
        commissionAsset: trade.feeCcy || 'USDT',
        timestamp: new Date(parseInt(trade.ts))
      }))
    } catch (error) {
      this.handleError(error, `获取交易历史 ${symbol}`)
    }
  }

  // 获取订单历史
  async getOrderHistory(symbol: string, limit: number = 100): Promise<Order[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const endpoint = `/trade/orders-history?instId=${normalizedSymbol}&limit=${limit}`
      const data = await this.authenticatedRequest(endpoint)

      return data.map((order: any) => ({
        orderId: order.ordId,
        symbol: normalizedSymbol,
        side: order.side,
        type: order.ordType,
        status: this.mapOrderStatus(order.state),
        quantity: parseFloat(order.sz),
        price: parseFloat(order.px || '0'),
        executedQuantity: parseFloat(order.accFillSz || '0'),
        averagePrice: parseFloat(order.avgPx || '0'),
        timestamp: new Date(parseInt(order.cTime)),
        updateTime: new Date(parseInt(order.uTime))
      }))
    } catch (error) {
      this.handleError(error, `获取订单历史 ${symbol}`)
    }
  }

  // 映射时间间隔
  private mapInterval(interval: string): string {
    const intervalMap: { [key: string]: string } = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6H',
      '8h': '8H',
      '12h': '12H',
      '1d': '1D',
      '3d': '3D',
      '1w': '1W',
      '1M': '1M'
    }
    return intervalMap[interval] || '1m'
  }

  // 获取时间间隔毫秒数
  private getIntervalMs(interval: string): number {
    const msMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    }
    return msMap[interval] || 60 * 1000
  }

  // 映射订单类型
  private mapOrderType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'MARKET': 'market',
      'LIMIT': 'limit',
      'STOP_MARKET': 'conditional',
      'STOP_LIMIT': 'conditional'
    }
    return typeMap[type] || 'limit'
  }

  // 映射订单状态
  private mapOrderStatus(status: string): 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' {
    const statusMap: { [key: string]: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' } = {
      'live': 'PENDING',
      'filled': 'FILLED',
      'canceled': 'CANCELLED',
      'expired': 'CANCELLED'
    }
    return statusMap[status] || 'PENDING'
  }
} 