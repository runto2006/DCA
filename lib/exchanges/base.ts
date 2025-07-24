// 统一交易接口定义
export interface ExchangeInterface {
  name: string
  isActive: boolean
  
  // 市场数据
  getPrice(symbol: string): Promise<number>
  getKlines(symbol: string, interval: string, limit: number): Promise<Kline[]>
  get24hrTicker(symbol: string): Promise<Ticker24hr>
  
  // 账户数据
  getBalance(symbol: string): Promise<Balance>
  getAllBalances(): Promise<Balance[]>
  getAccountInfo(): Promise<AccountInfo>
  
  // 交易功能
  placeOrder(order: OrderRequest): Promise<OrderResult>
  cancelOrder(symbol: string, orderId: string): Promise<boolean>
  getOrder(symbol: string, orderId: string): Promise<Order>
  getOpenOrders(symbol?: string): Promise<Order[]>
  
  // 历史数据
  getTradeHistory(symbol: string, limit?: number): Promise<Trade[]>
  getOrderHistory(symbol: string, limit?: number): Promise<Order[]>
}

// 订单请求接口
export interface OrderRequest {
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT'
  quantity: number
  price?: number
  stopPrice?: number
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
}

// 订单结果接口
export interface OrderResult {
  orderId: string
  symbol: string
  side: string
  type: string
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED'
  quantity: number
  price: number
  executedQuantity: number
  averagePrice: number
  timestamp: Date
  exchange: string
}

// K线数据接口
export interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteAssetVolume: number
  numberOfTrades: number
  takerBuyBaseAssetVolume: number
  takerBuyQuoteAssetVolume: number
}

// 24小时行情接口
export interface Ticker24hr {
  symbol: string
  priceChange: number
  priceChangePercent: number
  weightedAvgPrice: number
  prevClosePrice: number
  lastPrice: number
  lastQty: number
  bidPrice: number
  bidQty: number
  askPrice: number
  askQty: number
  openPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}

// 余额接口
export interface Balance {
  asset: string
  free: number
  locked: number
  total: number
}

// 账户信息接口
export interface AccountInfo {
  makerCommission: number
  takerCommission: number
  buyerCommission: number
  sellerCommission: number
  canTrade: boolean
  canWithdraw: boolean
  canDeposit: boolean
  updateTime: number
  accountType: string
  balances: Balance[]
}

// 订单接口
export interface Order {
  orderId: string
  symbol: string
  side: string
  type: string
  status: string
  quantity: number
  price: number
  executedQuantity: number
  averagePrice: number
  timestamp: Date
  updateTime: Date
}

// 交易记录接口
export interface Trade {
  id: string
  symbol: string
  side: string
  quantity: number
  price: number
  quoteQuantity: number
  commission: number
  commissionAsset: string
  timestamp: Date
}

// 交易所配置接口
export interface ExchangeConfig {
  name: string
  apiKey: string
  secretKey: string
  passphrase?: string // OKX需要
  sandbox: boolean
  isActive: boolean
}

// 交易所状态枚举
export enum ExchangeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

// 交易所错误类型
export class ExchangeError extends Error {
  constructor(
    message: string,
    public exchange: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ExchangeError'
  }
}

// 基础交易所类
export abstract class BaseExchange implements ExchangeInterface {
  abstract name: string
  abstract isActive: boolean
  
  protected config: ExchangeConfig
  protected status: ExchangeStatus = ExchangeStatus.INACTIVE
  
  constructor(config: ExchangeConfig) {
    this.config = config
  }
  
  // 抽象方法，子类必须实现
  abstract getPrice(symbol: string): Promise<number>
  abstract getKlines(symbol: string, interval: string, limit: number): Promise<Kline[]>
  abstract get24hrTicker(symbol: string): Promise<Ticker24hr>
  abstract getBalance(symbol: string): Promise<Balance>
  abstract getAllBalances(): Promise<Balance[]>
  abstract getAccountInfo(): Promise<AccountInfo>
  abstract placeOrder(order: OrderRequest): Promise<OrderResult>
  abstract cancelOrder(symbol: string, orderId: string): Promise<boolean>
  abstract getOrder(symbol: string, orderId: string): Promise<Order>
  abstract getOpenOrders(symbol?: string): Promise<Order[]>
  abstract getTradeHistory(symbol: string, limit?: number): Promise<Trade[]>
  abstract getOrderHistory(symbol: string, limit?: number): Promise<Order[]>
  
  // 通用方法
  getStatus(): ExchangeStatus {
    return this.status
  }
  
  setStatus(status: ExchangeStatus): void {
    this.status = status
  }
  
  isHealthy(): boolean {
    return this.status === ExchangeStatus.ACTIVE
  }
  
  // 符号标准化
  protected normalizeSymbol(symbol: string): string {
    // 移除空格，转换为大写
    return symbol.replace(/\s+/g, '').toUpperCase()
  }
  
  // 数量精度处理
  protected roundQuantity(quantity: number, precision: number): number {
    return Math.round(quantity * Math.pow(10, precision)) / Math.pow(10, precision)
  }
  
  // 价格精度处理
  protected roundPrice(price: number, precision: number): number {
    return Math.round(price * Math.pow(10, precision)) / Math.pow(10, precision)
  }
  
  // 错误处理
  protected handleError(error: any, operation: string): never {
    const message = `${this.name} ${operation} 失败: ${error.message || error}`
    throw new ExchangeError(message, this.name, error.code, error.statusCode)
  }
} 