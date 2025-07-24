import { ExchangeInterface, Kline, Ticker24hr, Balance, Order, Trade, OrderRequest, OrderResult, ExchangeConfig } from './base'
import { BaseExchange } from './base'
import { ExchangeConfigManager } from './config-manager'
import crypto from 'crypto'

export class GateAdapter extends BaseExchange implements ExchangeInterface {
  name = 'Gate.io'
  isActive = true
  private baseUrl = 'https://api.gateio.ws/api/v4'

  constructor() {
    const config = ExchangeConfigManager.getInstance().getConfig('gate')
    if (!config) {
      // 如果没有配置，创建一个默认配置用于公开API访问
      const defaultConfig: ExchangeConfig = {
        name: 'Gate.io',
        apiKey: '',
        secretKey: '',
        sandbox: false,
        isActive: true
      }
      super(defaultConfig)
    } else {
      super(config)
    }
  }

  async initialize(): Promise<boolean> {
    try {
      if (!this.config.apiKey || !this.config.secretKey) {
        console.log('⚠️ Gate.io API密钥未配置')
        return false
      }
      
      // 测试连接
      await this.getPrice('BTC_USDT')
      console.log('✅ Gate.io 交易所初始化成功')
      return true
    } catch (error) {
      console.log(`❌ Gate.io 交易所初始化失败: ${error}`)
      return false
    }
  }

  async getPrice(symbol: string): Promise<number> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const normalizedSymbol = this.normalizeSymbol(symbol)
        const url = `${this.baseUrl}/spot/tickers?currency_pair=${normalizedSymbol}`
        console.log(`🔍 Gate.io 调试: 第${attempt}次尝试, URL=${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(15000) // 15秒超时
        })
        
        console.log(`🔍 Gate.io 调试: 响应状态=${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ Gate.io 调试: HTTP错误=${response.status}, 响应=${errorText}`)
          throw new Error(`Gate.io API错误: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`🔍 Gate.io 调试: 响应数据长度=${Array.isArray(data) ? data.length : 'N/A'}`)
        
        // Gate.io API 直接返回数组，不是包含 data 字段的对象
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`❌ Gate.io 调试: 未找到交易对 ${normalizedSymbol}`)
          throw new Error(`Gate.io 获取价格失败: 未找到交易对 ${normalizedSymbol}`)
        }
        
        const price = parseFloat(data[0].last)
        console.log(`✅ Gate.io 调试: 成功获取价格 ${price} for ${normalizedSymbol}`)
        return price
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Gate.io 调试: 第${attempt}次尝试失败: ${error}`);
        
        if (attempt < maxRetries) {
          // 等待一段时间后重试
          const delay = Math.min(1000 * attempt, 5000); // 递增延迟，最大5秒
          console.log(`⏳ Gate.io 调试: 等待${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败了
    console.log(`❌ Gate.io 调试: 所有${maxRetries}次尝试都失败了`);
    throw new Error(`Gate.io 获取价格 ${symbol} 失败: ${lastError}`)
  }

  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.request('GET', `/spot/tickers?currency_pair=${normalizedSymbol}`)
      
      // Gate.io API 直接返回数组，不是包含 data 字段的对象
      if (!Array.isArray(response) || response.length === 0) {
        throw new Error(`Gate.io 获取24小时统计失败: 未找到交易对 ${normalizedSymbol}`)
      }
      
      const data = response[0]
      return {
        symbol: data.currency_pair,
        priceChange: parseFloat(data.change_percentage),
        priceChangePercent: parseFloat(data.change_percentage),
        weightedAvgPrice: parseFloat(data.base_volume),
        prevClosePrice: parseFloat(data.last),
        lastPrice: parseFloat(data.last),
        lastQty: parseFloat(data.base_volume),
        bidPrice: parseFloat(data.lowest_ask),
        bidQty: parseFloat(data.base_volume),
        askPrice: parseFloat(data.highest_bid),
        askQty: parseFloat(data.base_volume),
        openPrice: parseFloat(data.last),
        highPrice: parseFloat(data.high_24h),
        lowPrice: parseFloat(data.low_24h),
        volume: parseFloat(data.base_volume),
        quoteVolume: parseFloat(data.quote_volume),
        openTime: Date.now() - 24 * 60 * 60 * 1000,
        closeTime: Date.now(),
        firstId: 0,
        lastId: 0,
        count: 0
      }
    } catch (error) {
      throw new Error(`Gate.io 获取24小时统计失败: ${error}`)
    }
  }

  async getKlines(symbol: string, interval: string = '1d', limit: number = 100): Promise<Kline[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.request('GET', `/spot/candlesticks`, {
        currency_pair: normalizedSymbol,
        interval: this.mapInterval(interval),
        limit: limit
      })
      
      return response.data.map((item: any) => ({
        openTime: item.t * 1000,
        open: parseFloat(item.v[1]),
        high: parseFloat(item.v[2]),
        low: parseFloat(item.v[3]),
        close: parseFloat(item.v[4]),
        volume: parseFloat(item.v[5]),
        closeTime: item.t * 1000,
        quoteAssetVolume: parseFloat(item.v[5]),
        numberOfTrades: 0,
        takerBuyBaseAssetVolume: parseFloat(item.v[5]),
        takerBuyQuoteAssetVolume: parseFloat(item.v[5])
      }))
    } catch (error) {
      throw new Error(`Gate.io 获取K线数据失败: ${error}`)
    }
  }

  async getBalance(symbol: string): Promise<Balance> {
    try {
      const response = await this.request('GET', '/spot/accounts')
      const balance = response.data.find((item: any) => item.currency === symbol)
      
      if (!balance) {
        return {
          asset: symbol,
          free: 0,
          locked: 0,
          total: 0
        }
      }
      
      return {
        asset: balance.currency,
        free: parseFloat(balance.available),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.available) + parseFloat(balance.locked)
      }
    } catch (error) {
      throw new Error(`Gate.io 获取余额失败: ${error}`)
    }
  }

  async getAllBalances(): Promise<Balance[]> {
    try {
      const response = await this.request('GET', '/spot/accounts')
      return response.data.map((item: any) => ({
        asset: item.currency,
        free: parseFloat(item.available),
        locked: parseFloat(item.locked),
        total: parseFloat(item.available) + parseFloat(item.locked)
      }))
    } catch (error) {
      throw new Error(`Gate.io 获取所有余额失败: ${error}`)
    }
  }

  async placeOrder(orderRequest: OrderRequest): Promise<OrderResult> {
    try {
      const normalizedSymbol = this.normalizeSymbol(orderRequest.symbol)
      const response = await this.request('POST', '/spot/orders', {
        currency_pair: normalizedSymbol,
        side: orderRequest.side.toLowerCase(),
        amount: orderRequest.quantity.toString(),
        price: orderRequest.price?.toString(),
        type: orderRequest.type === 'MARKET' ? 'market' : 'limit'
      })
      
      return {
        orderId: response.data.id,
        symbol: response.data.currency_pair,
        status: this.mapOrderStatus(response.data.status),
        side: response.data.side.toUpperCase(),
        type: response.data.type.toUpperCase(),
        quantity: parseFloat(response.data.amount),
        price: parseFloat(response.data.price),
        executedQuantity: parseFloat(response.data.filled_amount),
        averagePrice: parseFloat(response.data.price),
        timestamp: new Date(),
        exchange: 'gate'
      }
    } catch (error) {
      throw new Error(`Gate.io 下单失败: ${error}`)
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      await this.request('DELETE', `/spot/orders/${orderId}`, {
        currency_pair: normalizedSymbol
      })
      return true
    } catch (error) {
      throw new Error(`Gate.io 取消订单失败: ${error}`)
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.request('GET', `/spot/orders/${orderId}`, {
        currency_pair: normalizedSymbol
      })
      
      return {
        orderId: response.data.id,
        symbol: response.data.currency_pair,
        status: this.mapOrderStatus(response.data.status),
        side: response.data.side.toUpperCase(),
        type: response.data.type.toUpperCase(),
        quantity: parseFloat(response.data.amount),
        price: parseFloat(response.data.price),
        executedQuantity: parseFloat(response.data.filled_amount),
        averagePrice: parseFloat(response.data.price),
        timestamp: new Date(response.data.create_time_ms),
        updateTime: new Date(response.data.update_time_ms)
      }
    } catch (error) {
      throw new Error(`Gate.io 获取订单失败: ${error}`)
    }
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      const params: any = {}
      if (symbol) {
        params.currency_pair = this.normalizeSymbol(symbol)
      }
      
      const response = await this.request('GET', '/spot/open_orders', params)
      
      return response.data.map((item: any) => ({
        orderId: item.id,
        symbol: item.currency_pair,
        status: this.mapOrderStatus(item.status),
        side: item.side.toUpperCase(),
        type: item.type.toUpperCase(),
        quantity: parseFloat(item.amount),
        price: parseFloat(item.price),
        executedQuantity: parseFloat(item.filled_amount),
        averagePrice: parseFloat(item.price),
        timestamp: new Date(item.create_time_ms),
        updateTime: new Date(item.update_time_ms)
      }))
    } catch (error) {
      throw new Error(`Gate.io 获取未完成订单失败: ${error}`)
    }
  }

  async getTradeHistory(symbol: string, limit: number = 50): Promise<Trade[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.request('GET', '/spot/my_trades', {
        currency_pair: normalizedSymbol,
        limit: limit
      })
      
      return response.data.map((item: any) => ({
        id: item.id,
        symbol: item.currency_pair,
        side: item.side,
        quantity: parseFloat(item.amount),
        price: parseFloat(item.price),
        quoteQuantity: parseFloat(item.total),
        commission: parseFloat(item.fee),
        commissionAsset: item.fee_currency,
        timestamp: new Date(item.create_time_ms)
      }))
    } catch (error) {
      throw new Error(`Gate.io 获取交易历史失败: ${error}`)
    }
  }

  async getOrderHistory(symbol: string, limit: number = 50): Promise<Order[]> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol)
      const response = await this.request('GET', '/spot/orders', {
        currency_pair: normalizedSymbol,
        limit: limit,
        status: 'finished'
      })
      
      return response.data.map((item: any) => ({
        orderId: item.id,
        symbol: item.currency_pair,
        status: this.mapOrderStatus(item.status),
        side: item.side.toUpperCase(),
        type: item.type.toUpperCase(),
        quantity: parseFloat(item.amount),
        price: parseFloat(item.price),
        executedQuantity: parseFloat(item.filled_amount),
        averagePrice: parseFloat(item.price),
        timestamp: new Date(item.create_time_ms),
        updateTime: new Date(item.update_time_ms)
      }))
    } catch (error) {
      throw new Error(`Gate.io 获取订单历史失败: ${error}`)
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.request('GET', '/spot/accounts')
      return {
        balances: response.data,
        permissions: ['SPOT']
      }
    } catch (error) {
      throw new Error(`Gate.io 获取账户信息失败: ${error}`)
    }
  }

  protected normalizeSymbol(symbol: string): string {
    // Gate.io使用下划线分隔，如BTC_USDT
    // 需要将SOLUSDT转换为SOL_USDT格式
    if (symbol.includes('USDT')) {
      const base = symbol.replace('USDT', '')
      return `${base}_USDT`
    } else if (symbol.includes('BTC')) {
      const base = symbol.replace('BTC', '')
      return `${base}_BTC`
    } else if (symbol.includes('ETH')) {
      const base = symbol.replace('ETH', '')
      return `${base}_ETH`
    }
    return symbol.replace('/', '_').toUpperCase()
  }

  private mapInterval(interval: string): string {
    const intervalMap: { [key: string]: string } = {
      '1m': '10s',
      '3m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M'
    }
    return intervalMap[interval] || '1d'
  }

  private mapOrderStatus(status: string): 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' {
    const statusMap: { [key: string]: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' } = {
      'open': 'PENDING',
      'closed': 'FILLED',
      'cancelled': 'CANCELLED',
      'pending': 'PENDING',
      'finished': 'FILLED'
    }
    return statusMap[status] || 'PENDING'
  }

  private async request(method: string, endpoint: string, params: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const timestamp = Date.now()
    
    let queryString = ''
    if (method === 'GET' && Object.keys(params).length > 0) {
      queryString = '?' + new URLSearchParams(params).toString()
    }
    
    const fullUrl = url + queryString
    console.log(`🔍 Gate.io request: ${method} ${fullUrl}`)
    
    const headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    
    // 只有在有API密钥的情况下才添加认证头
    if (this.config.apiKey && this.config.secretKey) {
      const signature = this.generateSignature(method, endpoint + queryString, timestamp, params)
      headers['KEY'] = this.config.apiKey
      headers['SIGN'] = signature
      headers['Timestamp'] = timestamp.toString()
    }
    
    const options: any = {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(params) : undefined
    }
    
    try {
      const response = await fetch(fullUrl, options)
      console.log(`🔍 Gate.io response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`❌ Gate.io error: ${errorText}`)
        throw new Error(`Gate.io ${method} ${endpoint} 失败: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`✅ Gate.io success: 数据长度=${Array.isArray(data) ? data.length : 'N/A'}`)
      return data
    } catch (error) {
      console.log(`❌ Gate.io request failed: ${error}`)
      throw error
    }
  }

  private generateSignature(method: string, endpoint: string, timestamp: number, body: any = {}): string {
    const message = method + '\n' + endpoint + '\n' + JSON.stringify(body) + '\n' + timestamp
    return crypto.createHmac('sha512', this.config.secretKey).update(message).digest('hex')
  }
} 