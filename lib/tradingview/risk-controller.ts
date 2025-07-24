import { TradeSignal } from './signal-types'
import { query } from '../database'
import { ExchangeManager } from '../exchanges/exchange-manager'

export interface RiskCheckResult {
  approved: boolean
  reasons: string[]
  recommendations: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  maxAmount: number
}

export class TradingViewRiskController {
  private exchangeManager: ExchangeManager | null = null
  private dailyLossLimit = 1000 // 日亏损限制 1000 USDT
  private maxPositionSize = 0.1 // 最大仓位比例 10%
  private minConfidence = 70 // 最小可信度 70%
  private maxLeverage = 5 // 最大杠杆 5倍
  private tradingHours = { start: 9, end: 17 } // 交易时间 9:00-17:00
  private maxSignalsPerHour = 3 // 每小时最大信号数
  private dailyLoss = 0
  private signalCount = new Map<string, number>() // 按小时统计信号数

  constructor() {
    this.initializeExchangeManager()
  }

  private async initializeExchangeManager() {
    try {
      this.exchangeManager = await ExchangeManager.getInstance()
    } catch (error) {
      console.error('初始化交易所管理器失败:', error)
    }
  }

  async performRiskCheck(signal: TradeSignal): Promise<RiskCheckResult> {
    // 确保交易所管理器已初始化
    if (!this.exchangeManager) {
      await this.initializeExchangeManager()
    }

    const checks = await Promise.all([
      this.checkDailyLoss(),
      this.checkPositionSize(signal),
      this.checkSignalConfidence(signal),
      this.checkLeverage(signal),
      this.checkMarketHours(),
      this.checkSignalFrequency(signal),
      this.checkAccountBalance(signal)
    ])
    
    const failedChecks = checks.filter(check => !check.passed)
    
    return {
      approved: failedChecks.length === 0,
      reasons: failedChecks.map(check => check.reason).filter(Boolean) as string[],
      riskScore: this.calculateRiskScore(checks),
      recommendations: this.generateRecommendations(failedChecks)
    }
  }
  
  private async checkDailyLoss(): Promise<RiskCheck> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const dailyPnL = await this.getDailyPnL(today)
      
      return {
        passed: dailyPnL > -this.maxDailyLoss,
        reason: dailyPnL <= -this.maxDailyLoss ? 
          `日亏损已达限制: ${dailyPnL.toFixed(2)} USDT` : undefined
      }
    } catch (error) {
      console.error('检查日亏损失败:', error)
      return { passed: true } // 如果检查失败，允许交易
    }
  }
  
  private async checkPositionSize(signal: TradeSignal): Promise<RiskCheck> {
    try {
      const accountBalance = await this.getAccountBalance(signal.exchange)
      const positionValue = signal.quantity * (signal.price || 0)
      const positionRatio = positionValue / accountBalance
      
      return {
        passed: positionRatio <= this.maxPositionSize,
        reason: positionRatio > this.maxPositionSize ? 
          `仓位过大: ${(positionRatio * 100).toFixed(2)}%` : undefined
      }
    } catch (error) {
      console.error('检查仓位大小失败:', error)
      return { passed: true }
    }
  }
  
  private checkSignalConfidence(signal: TradeSignal): Promise<RiskCheck> {
    return Promise.resolve({
      passed: signal.confidence >= this.minConfidence,
      reason: signal.confidence < this.minConfidence ? 
        `信号可信度过低: ${signal.confidence}%` : undefined
    })
  }
  
  private checkLeverage(signal: TradeSignal): Promise<RiskCheck> {
    if (!signal.leverage) {
      return Promise.resolve({ passed: true })
    }
    
    return Promise.resolve({
      passed: signal.leverage <= this.maxLeverage,
      reason: signal.leverage > this.maxLeverage ? 
        `杠杆倍数过高: ${signal.leverage}x` : undefined
    })
  }
  
  private checkMarketHours(): Promise<RiskCheck> {
    // 如果配置中未启用交易时间限制，则跳过检查
    if (!this.config?.tradingHours?.enabled) {
      return Promise.resolve({ passed: true })
    }
    
    // 检查是否在交易时间内
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const currentTime = hour * 60 + minute
    
    const startTime = this.config.tradingHours.start || '09:00'
    const endTime = this.config.tradingHours.end || '17:00'
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    // 处理跨日的情况
    let isTradingHours = false
    if (endMinutes > startMinutes) {
      // 同日内
      isTradingHours = currentTime >= startMinutes && currentTime < endMinutes
    } else {
      // 跨日
      isTradingHours = currentTime >= startMinutes || currentTime < endMinutes
    }
    
    return Promise.resolve({
      passed: isTradingHours,
      reason: !isTradingHours ? '当前不在交易时间内' : undefined
    })
  }
  
  private async checkSignalFrequency(signal: TradeSignal): Promise<RiskCheck> {
    try {
      // 检查最近1小时内是否已有相同交易对的信号
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM tradingview_signals 
        WHERE symbol = $1 
        AND timestamp > $2
      `, [signal.symbol, oneHourAgo.toISOString()])
      
      const recentSignals = parseInt(result.rows[0]?.count || '0')
      
      return {
        passed: recentSignals < 3, // 最多允许1小时内3个信号
        reason: recentSignals >= 3 ? 
          `信号频率过高: 1小时内已有${recentSignals}个信号` : undefined
      }
    } catch (error) {
      console.error('检查信号频率失败:', error)
      return { passed: true }
    }
  }
  
  private async checkAccountBalance(signal: TradeSignal): Promise<RiskCheck> {
    try {
      const balance = await this.getAccountBalance(signal.exchange)
      const requiredAmount = signal.quantity * (signal.price || 0)
      
      return {
        passed: balance >= requiredAmount,
        reason: balance < requiredAmount ? 
          `账户余额不足: 需要${requiredAmount.toFixed(2)} USDT，当前${balance.toFixed(2)} USDT` : undefined
      }
    } catch (error) {
      console.error('检查账户余额失败:', error)
      return { passed: true }
    }
  }
  
  private async getDailyPnL(date: string): Promise<number> {
    try {
      const result = await query(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN side = 'BUY' THEN -quantity * price
            WHEN side = 'SELL' THEN quantity * price
          END
        ), 0) as daily_pnl
        FROM trade_history 
        WHERE DATE(timestamp) = $1
      `, [date])
      
      return parseFloat(result.rows[0]?.daily_pnl || '0')
    } catch (error) {
      console.error('获取日盈亏失败:', error)
      return 0
    }
  }
  
  private async getAccountBalance(exchange: string): Promise<number> {
    try {
      const exchangeAdapter = this.exchangeManager.getExchange(exchange)
      if (!exchangeAdapter) {
        throw new Error(`交易所 ${exchange} 不可用`)
      }
      
      const balances = await exchangeAdapter.getAllBalances()
      const usdtBalance = balances.find(b => b.asset === 'USDT')
      
      return usdtBalance ? usdtBalance.free : 0
    } catch (error) {
      console.error(`获取${exchange}账户余额失败:`, error)
      return 1000 // 默认余额
    }
  }
  
  private calculateRiskScore(checks: RiskCheck[]): number {
    const failedChecks = checks.filter(check => !check.passed)
    const totalChecks = checks.length
    
    if (totalChecks === 0) return 0
    
    return Math.round((failedChecks.length / totalChecks) * 100)
  }
  
  private generateRecommendations(failedChecks: RiskCheck[]): string[] {
    const recommendations: string[] = []
    
    failedChecks.forEach(check => {
      if (check.reason) {
        if (check.reason.includes('日亏损')) {
          recommendations.push('建议暂停交易，等待市场稳定')
        } else if (check.reason.includes('仓位过大')) {
          recommendations.push('建议减少仓位大小')
        } else if (check.reason.includes('可信度')) {
          recommendations.push('建议等待更可靠的信号')
        } else if (check.reason.includes('杠杆')) {
          recommendations.push('建议降低杠杆倍数')
        } else if (check.reason.includes('余额不足')) {
          recommendations.push('建议充值或减少交易金额')
        }
      }
    })
    
    return recommendations
  }
} 