import { TradingViewSignal, TradeSignal } from './signal-types'
import { ExchangeManager } from '../exchanges/exchange-manager'

export class TradingViewSignalParser {
  private exchangeManager: ExchangeManager | null = null
  
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
  
  async parseSignal(rawSignal: any): Promise<TradeSignal> {
    // 确保交易所管理器已初始化
    if (!this.exchangeManager) {
      await this.initializeExchangeManager()
    }
    
    // 标准化信号格式
    const signal = this.normalizeSignal(rawSignal)
    
    // 验证必要字段
    this.validateSignal(signal)
    
    // 解析交易对
    const symbol = this.parseSymbol(signal.symbol)
    
    // 计算订单数量
    const quantity = this.calculateQuantity(signal)
    
    // 确定订单类型
    const orderType = this.determineOrderType(signal)
    
    // 选择目标交易所
    const exchange = this.selectExchange(signal)
    
    return {
      symbol,
      action: signal.action,
      exchange,
      orderType,
      quantity,
      price: signal.price,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      leverage: signal.leverage,
      confidence: signal.confidence,
      strategy: signal.strategy,
      timestamp: signal.timestamp
    }
  }
  
  private normalizeSignal(rawSignal: any): TradingViewSignal {
    // 处理不同格式的TradingView信号
    if (rawSignal.alert_text) {
      return this.parseAlertText(rawSignal.alert_text)
    }
    
    if (rawSignal.strategy) {
      return this.parseStrategySignal(rawSignal)
    }
    
    // 处理JSON格式信号
    if (typeof rawSignal === 'object') {
      return {
        symbol: rawSignal.symbol || rawSignal.pair,
        action: rawSignal.action || rawSignal.side,
        strategy: rawSignal.strategy || 'manual',
        timeframe: rawSignal.timeframe || '1h',
        price: rawSignal.price ? parseFloat(rawSignal.price) : undefined,
        stopLoss: rawSignal.stopLoss ? parseFloat(rawSignal.stopLoss) : undefined,
        takeProfit: rawSignal.takeProfit ? parseFloat(rawSignal.takeProfit) : undefined,
        positionSize: rawSignal.positionSize ? parseFloat(rawSignal.positionSize) : undefined,
        leverage: rawSignal.leverage ? parseInt(rawSignal.leverage) : undefined,
        confidence: rawSignal.confidence ? parseInt(rawSignal.confidence) : 80,
        strength: rawSignal.strength || 'MEDIUM',
        timestamp: rawSignal.timestamp || Date.now(),
        source: rawSignal.source || 'tradingview',
        message: rawSignal.message,
        signature: rawSignal.signature,
        apiKey: rawSignal.apiKey
      } as TradingViewSignal
    }
    
    throw new Error('无法识别的信号格式')
  }
  
  private parseAlertText(alertText: string): TradingViewSignal {
    // 解析TradingView的alert_text格式
    // 例如: "BUY SOLUSDT @ 200.50 SL: 195.00 TP: 210.00"
    const regex = /(BUY|SELL|CLOSE)\s+(\w+)\s+@\s+([\d.]+)(?:\s+SL:\s+([\d.]+))?(?:\s+TP:\s+([\d.]+))?/
    const match = alertText.match(regex)
    
    if (!match) {
      throw new Error('无法解析TradingView信号格式')
    }
    
    return {
      action: match[1] as 'BUY' | 'SELL' | 'CLOSE',
      symbol: match[2],
      price: parseFloat(match[3]),
      stopLoss: match[4] ? parseFloat(match[4]) : undefined,
      takeProfit: match[5] ? parseFloat(match[5]) : undefined,
      confidence: 80,
      strength: 'MEDIUM',
      timestamp: Date.now(),
      source: 'tradingview',
      strategy: 'alert',
      timeframe: '1h'
    }
  }
  
  private parseStrategySignal(rawSignal: any): TradingViewSignal {
    // 解析策略信号格式
    return {
      symbol: rawSignal.symbol,
      action: rawSignal.action,
      strategy: rawSignal.strategy,
      timeframe: rawSignal.timeframe || '1h',
      price: rawSignal.price ? parseFloat(rawSignal.price) : undefined,
      stopLoss: rawSignal.stopLoss ? parseFloat(rawSignal.stopLoss) : undefined,
      takeProfit: rawSignal.takeProfit ? parseFloat(rawSignal.takeProfit) : undefined,
      positionSize: rawSignal.positionSize ? parseFloat(rawSignal.positionSize) : undefined,
      leverage: rawSignal.leverage ? parseInt(rawSignal.leverage) : undefined,
      confidence: rawSignal.confidence ? parseInt(rawSignal.confidence) : 80,
      strength: rawSignal.strength || 'MEDIUM',
      timestamp: rawSignal.timestamp || Date.now(),
      source: 'tradingview',
      message: rawSignal.message
    }
  }
  
  private validateSignal(signal: TradingViewSignal): void {
    if (!signal.symbol) {
      throw new Error('缺少交易对信息')
    }
    
    if (!signal.action || !['BUY', 'SELL', 'CLOSE'].includes(signal.action)) {
      throw new Error('无效的操作类型')
    }
    
    if (!signal.strategy) {
      throw new Error('缺少策略信息')
    }
    
    if (signal.confidence < 0 || signal.confidence > 100) {
      throw new Error('信号可信度必须在0-100之间')
    }
  }
  
  private parseSymbol(symbol: string): string {
    // 标准化交易对格式
    const normalized = symbol.toUpperCase()
    
    // 确保包含USDT后缀
    if (!normalized.includes('USDT') && !normalized.includes('BTC')) {
      return `${normalized}USDT`
    }
    
    return normalized
  }
  
  private calculateQuantity(signal: TradingViewSignal): number {
    // 根据仓位大小计算数量
    if (signal.positionSize) {
      // 如果是百分比，需要根据账户余额计算
      if (signal.positionSize <= 1) {
        // 百分比形式，需要获取账户余额
        return signal.positionSize * 10 // 临时返回较小的百分比值
      } else {
        // 固定金额
        return signal.positionSize
      }
    }
    
    // 默认数量 - 调整为更合理的值
    return 10 // 默认10 USDT
  }
  
  private determineOrderType(signal: TradingViewSignal): 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT' {
    // 根据信号内容确定订单类型
    if (signal.price) {
      return 'LIMIT'
    }
    
    return 'MARKET'
  }
  
  private selectExchange(signal: TradingViewSignal): string {
    // 根据信号或配置选择交易所
    // 这里可以根据价格、流动性等因素智能选择
    const availableExchanges = this.exchangeManager?.getActiveExchanges() || []
    
    if (availableExchanges.length === 0) {
      throw new Error('没有可用的交易所')
    }
    
    // 简单策略：选择第一个可用交易所
    return availableExchanges[0].name.toLowerCase()
  }
} 