import { ExchangeInterface, ExchangeConfig, ExchangeStatus } from './base'
import { ExchangeConfigManager } from './config-manager'
import { BinanceAdapter } from './binance-adapter'
import { OKXAdapter } from './okx-adapter'
import { BitgetAdapter } from './bitget-adapter'
import { GateAdapter } from './gate-adapter'

// 交易所管理器
export class ExchangeManager {
  private static instance: ExchangeManager
  private exchanges: Map<string, ExchangeInterface> = new Map()
  private configManager: ExchangeConfigManager
  
  private constructor() {
    this.configManager = ExchangeConfigManager.getInstance()
  }
  
  static async getInstance(): Promise<ExchangeManager> {
    if (!ExchangeManager.instance) {
      ExchangeManager.instance = new ExchangeManager()
      await ExchangeManager.instance.initializeExchanges()
    }
    return ExchangeManager.instance
  }
  
  // 初始化交易所
  private async initializeExchanges(): Promise<void> {
    console.log('🔄 初始化交易所管理器...')
    
    const configs = this.configManager.getAllConfigs()
    const configEntries = Array.from(configs.entries())
    
    for (const [name, config] of configEntries) {
      try {
        await this.addExchange(name, config)
        console.log(`✅ ${name} 交易所初始化成功`)
      } catch (error) {
        console.error(`❌ ${name} 交易所初始化失败:`, error)
      }
    }
    
    console.log(`📊 交易所管理器初始化完成，共 ${this.exchanges.size} 个交易所`)
  }
  
  // 添加交易所
  async addExchange(name: string, config: ExchangeConfig): Promise<void> {
    let exchange: ExchangeInterface
    
    switch (name.toLowerCase()) {
      case 'binance':
        exchange = new BinanceAdapter(config)
        break
      case 'okx':
        exchange = new OKXAdapter(config)
        break
      case 'bitget':
        exchange = new BitgetAdapter(config)
        break
      case 'gate':
        exchange = new GateAdapter()
        break
      default:
        throw new Error(`不支持的交易所: ${name}`)
    }
    
    this.exchanges.set(name.toLowerCase(), exchange)
  }
  
  // 获取交易所
  getExchange(name: string): ExchangeInterface | undefined {
    return this.exchanges.get(name.toLowerCase())
  }
  
  // 获取所有交易所
  getAllExchanges(): Map<string, ExchangeInterface> {
    return new Map(this.exchanges)
  }
  
  // 获取活跃的交易所
  getActiveExchanges(): ExchangeInterface[] {
    return Array.from(this.exchanges.values()).filter(exchange => exchange.isActive)
  }
  
  // 获取交易所名称列表
  getExchangeNames(): string[] {
    return Array.from(this.exchanges.keys())
  }
  
  // 检查交易所是否存在
  hasExchange(name: string): boolean {
    return this.exchanges.has(name.toLowerCase())
  }
  
  // 移除交易所
  removeExchange(name: string): boolean {
    return this.exchanges.delete(name.toLowerCase())
  }
  
  // 获取交易所状态
  getExchangeStatus(name: string): ExchangeStatus | null {
    const exchange = this.getExchange(name)
    if (!exchange) return null
    
    if (exchange instanceof BinanceAdapter) {
      return exchange.getStatus()
    }
    
    return exchange.isActive ? ExchangeStatus.ACTIVE : ExchangeStatus.INACTIVE
  }
  
  // 获取所有交易所状态
  getAllExchangeStatuses(): Array<{name: string, status: ExchangeStatus, isActive: boolean}> {
    return Array.from(this.exchanges.entries()).map(([name, exchange]) => ({
      name,
      status: this.getExchangeStatus(name) || ExchangeStatus.INACTIVE,
      isActive: exchange.isActive
    }))
  }
  
  // 健康检查
  async healthCheck(): Promise<Array<{name: string, healthy: boolean, error?: string}>> {
    const results = []
    const exchangeEntries = Array.from(this.exchanges.entries())
    
    for (const [name, exchange] of exchangeEntries) {
      try {
        // 尝试获取价格来测试连接
        await exchange.getPrice('BTCUSDT')
        results.push({ name, healthy: true })
      } catch (error) {
        results.push({ 
          name, 
          healthy: false, 
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }
    
    return results
  }
  
  // 获取最佳价格（多交易所价格聚合）
  async getBestPrice(symbol: string): Promise<{
    price: number
    exchange: string
    allPrices: Array<{exchange: string, price: number}>
  }> {
    const prices: Array<{exchange: string, price: number}> = []
    const exchangeEntries = Array.from(this.exchanges.entries())
    
    for (const [name, exchange] of exchangeEntries) {
      try {
        const price = await exchange.getPrice(symbol)
        prices.push({ exchange: name, price })
      } catch (error) {
        console.warn(`${name} 获取 ${symbol} 价格失败:`, error)
      }
    }
    
    if (prices.length === 0) {
      throw new Error(`无法从任何交易所获取 ${symbol} 价格`)
    }
    
    // 找到最低价格（买入时）
    const bestPrice = prices.reduce((min, current) => 
      current.price < min.price ? current : min
    )
    
    return {
      price: bestPrice.price,
      exchange: bestPrice.exchange,
      allPrices: prices
    }
  }
  
  // 获取价格差异（用于套利分析）
  async getPriceSpread(symbol: string): Promise<{
    symbol: string
    spread: number
    spreadPercent: number
    lowest: {exchange: string, price: number}
    highest: {exchange: string, price: number}
    allPrices: Array<{exchange: string, price: number}>
  }> {
    const prices: Array<{exchange: string, price: number}> = []
    const exchangeEntries = Array.from(this.exchanges.entries())
    
    for (const [name, exchange] of exchangeEntries) {
      try {
        const price = await exchange.getPrice(symbol)
        prices.push({ exchange: name, price })
      } catch (error) {
        console.warn(`${name} 获取 ${symbol} 价格失败:`, error)
      }
    }
    
    if (prices.length < 2) {
      throw new Error(`需要至少2个交易所的价格来计算价差`)
    }
    
    const sortedPrices = prices.sort((a, b) => a.price - b.price)
    const lowest = sortedPrices[0]
    const highest = sortedPrices[sortedPrices.length - 1]
    const spread = highest.price - lowest.price
    const spreadPercent = (spread / lowest.price) * 100
    
    return {
      symbol,
      spread,
      spreadPercent,
      lowest,
      highest,
      allPrices: prices
    }
  }
  
  // 获取配置摘要
  getConfigSummary(): Array<{name: string, isActive: boolean, hasConfig: boolean, status: ExchangeStatus}> {
    return this.configManager.getConfigSummary().map(config => ({
      ...config,
      status: this.getExchangeStatus(config.name) || ExchangeStatus.INACTIVE
    }))
  }
  
  // 重新加载配置
  async reloadConfigs(): Promise<void> {
    console.log('🔄 重新加载交易所配置...')
    
    // 清空现有交易所
    this.exchanges.clear()
    
    // 重新初始化
    await this.initializeExchanges()
    
    console.log('✅ 交易所配置重新加载完成')
  }
} 