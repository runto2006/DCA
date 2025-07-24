import { ExchangeManager } from './exchanges/exchange-manager'
import { ExchangeError } from './exchanges/base'

// 套利机会接口
export interface ArbitrageOpportunity {
  symbol: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  spread: number
  spreadPercent: number
  estimatedProfit: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp: Date
}

// 套利保护配置
export interface ArbitrageProtectionConfig {
  minSpreadPercent: number // 最小价差百分比
  maxSpreadPercent: number // 最大价差百分比（异常保护）
  minProfitAmount: number // 最小利润金额
  maxOrderAmount: number // 最大订单金额
  maxConcurrentOrders: number // 最大并发订单数
  cooldownPeriod: number // 冷却期（毫秒）
  riskLevels: {
    low: { maxAmount: number; maxSpread: number }
    medium: { maxAmount: number; maxSpread: number }
    high: { maxAmount: number; maxSpread: number }
  }
}

// 套利保护状态
export interface ArbitrageProtectionStatus {
  isEnabled: boolean
  lastCheck: Date
  activeOpportunities: number
  totalProfit: number
  totalTrades: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  warnings: string[]
}

// 套利交易记录
export interface ArbitrageTrade {
  id: string
  symbol: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  amount: number
  profit: number
  profitPercent: number
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED'
  timestamp: Date
  executionTime?: number
  error?: string
}

export class ArbitrageProtection {
  private exchangeManager: ExchangeManager
  private config: ArbitrageProtectionConfig
  private status: ArbitrageProtectionStatus
  private tradeHistory: ArbitrageTrade[] = []
  private lastTradeTime: Map<string, number> = new Map()
  private activeOrders: Set<string> = new Set()

  constructor(config: ArbitrageProtectionConfig) {
    this.config = config
    this.status = {
      isEnabled: true,
      lastCheck: new Date(),
      activeOpportunities: 0,
      totalProfit: 0,
      totalTrades: 0,
      riskLevel: 'LOW',
      warnings: []
    }
    this.initializeExchangeManager()
  }

  private async initializeExchangeManager() {
    try {
      this.exchangeManager = await ExchangeManager.getInstance()
    } catch (error) {
      console.error('初始化交易所管理器失败:', error)
    }
  }

  // 检测套利机会
  async detectArbitrageOpportunities(symbol: string): Promise<ArbitrageOpportunity[]> {
    try {
      const opportunities: ArbitrageOpportunity[] = []
      
      // 确保交易所管理器已初始化
      if (!this.exchangeManager) {
        await this.initializeExchangeManager()
      }
      
      // 如果仍然没有初始化成功，返回空数组
      if (!this.exchangeManager) {
        console.warn('交易所管理器未初始化，无法检测套利机会')
        return opportunities
      }
      
      const prices = await this.exchangeManager.getPriceSpread(symbol)
      
      if (prices.allPrices.length < 2) {
        return opportunities
      }

      // 按价格排序
      const sortedPrices = prices.allPrices.sort((a, b) => a.price - b.price)
      
      // 检查每个交易所组合的套利机会
      for (let i = 0; i < sortedPrices.length - 1; i++) {
        for (let j = i + 1; j < sortedPrices.length; j++) {
          const buyPrice = sortedPrices[i].price
          const sellPrice = sortedPrices[j].price
          const spread = sellPrice - buyPrice
          const spreadPercent = (spread / buyPrice) * 100

          // 检查是否满足最小价差要求
          if (spreadPercent >= this.config.minSpreadPercent && 
              spreadPercent <= this.config.maxSpreadPercent) {
            
            const estimatedProfit = spread * this.config.maxOrderAmount
            const risk = this.calculateRiskLevel(spreadPercent, estimatedProfit)
            
            opportunities.push({
              symbol,
              buyExchange: sortedPrices[i].exchange,
              sellExchange: sortedPrices[j].exchange,
              buyPrice,
              sellPrice,
              spread,
              spreadPercent,
              estimatedProfit,
              risk,
              timestamp: new Date()
            })
          }
        }
      }

      this.status.activeOpportunities = opportunities.length
      this.status.lastCheck = new Date()
      
      return opportunities
    } catch (error) {
      console.error('检测套利机会失败:', error)
      return []
    }
  }

  // 计算风险等级
  private calculateRiskLevel(spreadPercent: number, estimatedProfit: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (spreadPercent <= this.config.riskLevels.low.maxSpread && 
        estimatedProfit <= this.config.riskLevels.low.maxAmount) {
      return 'LOW'
    } else if (spreadPercent <= this.config.riskLevels.medium.maxSpread && 
               estimatedProfit <= this.config.riskLevels.medium.maxAmount) {
      return 'MEDIUM'
    } else {
      return 'HIGH'
    }
  }

  // 执行套利交易
  async executeArbitrage(opportunity: ArbitrageOpportunity, amount: number): Promise<ArbitrageTrade> {
    const tradeId = `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 创建交易记录
    const trade: ArbitrageTrade = {
      id: tradeId,
      symbol: opportunity.symbol,
      buyExchange: opportunity.buyExchange,
      sellExchange: opportunity.sellExchange,
      buyPrice: opportunity.buyPrice,
      sellPrice: opportunity.sellPrice,
      amount,
      profit: opportunity.spread * amount,
      profitPercent: opportunity.spreadPercent,
      status: 'PENDING',
      timestamp: new Date()
    }

    try {
      // 确保交易所管理器已初始化
      if (!this.exchangeManager) {
        await this.initializeExchangeManager()
      }
      
      // 如果仍然没有初始化成功，抛出错误
      if (!this.exchangeManager) {
        throw new Error('交易所管理器未初始化，无法执行套利交易')
      }
      
      // 检查冷却期
      const lastTrade = this.lastTradeTime.get(opportunity.symbol)
      if (lastTrade && Date.now() - lastTrade < this.config.cooldownPeriod) {
        throw new Error(`冷却期未结束，请等待 ${this.config.cooldownPeriod / 1000} 秒`)
      }

      // 检查并发订单数
      if (this.activeOrders.size >= this.config.maxConcurrentOrders) {
        throw new Error('达到最大并发订单数限制')
      }

      // 检查风险等级
      if (opportunity.risk === 'HIGH' && this.status.riskLevel === 'HIGH') {
        throw new Error('高风险套利被阻止')
      }

      // 添加到活跃订单
      this.activeOrders.add(tradeId)
      this.lastTradeTime.set(opportunity.symbol, Date.now())

      const startTime = Date.now()

      // 执行买入订单
      const buyExchange = this.exchangeManager.getExchange(opportunity.buyExchange)
      if (!buyExchange) {
        throw new Error(`交易所 ${opportunity.buyExchange} 不可用`)
      }

      const buyOrder = await buyExchange.placeOrder({
        symbol: opportunity.symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity: amount
      })

      // 执行卖出订单
      const sellExchange = this.exchangeManager.getExchange(opportunity.sellExchange)
      if (!sellExchange) {
        throw new Error(`交易所 ${opportunity.sellExchange} 不可用`)
      }

      const sellOrder = await sellExchange.placeOrder({
        symbol: opportunity.symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: amount
      })

      // 更新交易状态
      trade.status = 'EXECUTED'
      trade.executionTime = Date.now() - startTime

      // 更新统计信息
      this.status.totalTrades++
      this.status.totalProfit += trade.profit
      this.activeOrders.delete(tradeId)

      // 添加到交易历史
      this.tradeHistory.push(trade)

      console.log(`✅ 套利交易执行成功: ${trade.profit.toFixed(4)} USDT`)

      return trade

    } catch (error) {
      // 更新交易状态为失败
      trade.status = 'FAILED'
      trade.error = error instanceof Error ? error.message : '未知错误'
      this.activeOrders.delete(tradeId)

      // 添加到交易历史
      this.tradeHistory.push(trade)

      console.error(`❌ 套利交易执行失败:`, error)
      throw error
    }
  }

  // 获取保护状态
  getStatus(): ArbitrageProtectionStatus {
    return { ...this.status }
  }

  // 获取交易历史
  getTradeHistory(limit: number = 50): ArbitrageTrade[] {
    return this.tradeHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // 更新配置
  updateConfig(newConfig: Partial<ArbitrageProtectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 启用/禁用保护
  setEnabled(enabled: boolean): void {
    this.status.isEnabled = enabled
  }

  // 风险检查
  async performRiskCheck(): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    warnings: string[]
    recommendations: string[]
  }> {
    const warnings: string[] = []
    const recommendations: string[] = []

    // 检查活跃订单数
    if (this.activeOrders.size > this.config.maxConcurrentOrders * 0.8) {
      warnings.push(`活跃订单数较高: ${this.activeOrders.size}/${this.config.maxConcurrentOrders}`)
      recommendations.push('考虑减少并发订单数')
    }

    // 检查总利润
    if (this.status.totalProfit < 0) {
      warnings.push(`总利润为负: ${this.status.totalProfit.toFixed(4)} USDT`)
      recommendations.push('检查套利策略和风险控制参数')
    }

    // 检查交易成功率
    const recentTrades = this.tradeHistory.slice(-20)
    const successRate = recentTrades.filter(t => t.status === 'EXECUTED').length / recentTrades.length
    if (successRate < 0.8) {
      warnings.push(`交易成功率较低: ${(successRate * 100).toFixed(1)}%`)
      recommendations.push('检查网络连接和交易所API状态')
    }

    // 确定风险等级
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (warnings.length >= 3) {
      riskLevel = 'HIGH'
    } else if (warnings.length >= 1) {
      riskLevel = 'MEDIUM'
    }

    this.status.riskLevel = riskLevel
    this.status.warnings = warnings

    return {
      riskLevel,
      warnings,
      recommendations
    }
  }

  // 紧急停止所有套利
  async emergencyStop(): Promise<void> {
    console.log('🚨 执行紧急停止套利操作')
    
    // 取消所有活跃订单
    for (const orderId of this.activeOrders) {
      try {
        // 这里应该实现取消订单的逻辑
        console.log(`取消订单: ${orderId}`)
      } catch (error) {
        console.error(`取消订单失败: ${orderId}`, error)
      }
    }

    this.activeOrders.clear()
    this.status.isEnabled = false
    this.status.warnings.push('套利系统已紧急停止')
  }

  // 获取套利统计
  getArbitrageStats(): {
    totalTrades: number
    successfulTrades: number
    totalProfit: number
    averageProfit: number
    successRate: number
    bestTrade: ArbitrageTrade | null
    worstTrade: ArbitrageTrade | null
  } {
    const successfulTrades = this.tradeHistory.filter(t => t.status === 'EXECUTED')
    const totalProfit = successfulTrades.reduce((sum, t) => sum + t.profit, 0)
    const averageProfit = successfulTrades.length > 0 ? totalProfit / successfulTrades.length : 0
    const successRate = this.tradeHistory.length > 0 ? successfulTrades.length / this.tradeHistory.length : 0

    const bestTrade = successfulTrades.length > 0 
      ? successfulTrades.reduce((best, current) => current.profit > best.profit ? current : best)
      : null

    const worstTrade = successfulTrades.length > 0
      ? successfulTrades.reduce((worst, current) => current.profit < worst.profit ? current : worst)
      : null

    return {
      totalTrades: this.tradeHistory.length,
      successfulTrades: successfulTrades.length,
      totalProfit,
      averageProfit,
      successRate,
      bestTrade,
      worstTrade
    }
  }
}

// 默认配置
export const DEFAULT_ARBITRAGE_CONFIG: ArbitrageProtectionConfig = {
  minSpreadPercent: 0.1, // 最小价差 0.1%
  maxSpreadPercent: 5.0, // 最大价差 5%（异常保护）
  minProfitAmount: 1.0, // 最小利润 1 USDT
  maxOrderAmount: 100, // 最大订单金额 100 USDT
  maxConcurrentOrders: 3, // 最大并发订单数
  cooldownPeriod: 5000, // 冷却期 5 秒
  riskLevels: {
    low: { maxAmount: 50, maxSpread: 0.5 },
    medium: { maxAmount: 100, maxSpread: 1.0 },
    high: { maxAmount: 200, maxSpread: 2.0 }
  }
} 