// TradingView信号类型定义

export interface TradingViewSignal {
  // 基础信息
  symbol: string                    // 交易对，如 "SOLUSDT"
  action: 'BUY' | 'SELL' | 'CLOSE' // 操作类型
  strategy: string                  // 策略名称
  timeframe: string                 // 时间框架
  
  // 价格信息
  price?: number                    // 建议价格（可选）
  stopLoss?: number                 // 止损价格
  takeProfit?: number               // 止盈价格
  
  // 仓位信息
  positionSize?: number             // 仓位大小（百分比或固定金额）
  leverage?: number                 // 杠杆倍数
  
  // 信号强度
  confidence: number                // 信号可信度 (0-100)
  strength: 'STRONG' | 'MEDIUM' | 'WEAK' // 信号强度
  
  // 元数据
  timestamp: number                 // 信号时间戳
  source: string                    // 信号来源
  message?: string                  // 附加信息
  
  // 安全验证
  signature?: string                // 签名验证
  apiKey?: string                   // API密钥
}

export interface TradeSignal {
  symbol: string
  action: 'BUY' | 'SELL' | 'CLOSE'
  exchange: string                  // 目标交易所
  orderType: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT'
  quantity: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  leverage?: number
  confidence: number
  strategy: string
  timestamp: number
}

export interface RiskCheck {
  passed: boolean
  reason?: string
}

export interface RiskCheckResult {
  approved: boolean
  reasons: string[]
  riskScore: number
  recommendations: string[]
}

export interface ExecutionResult {
  success: boolean
  mainOrder?: any
  stopLossOrder?: any
  takeProfitOrder?: any
  error?: string
  timestamp: number
}

export interface TradingViewConfig {
  // 基础配置
  enabled: boolean
  webhookUrl: string
  secretKey: string
  
  // 交易所配置
  defaultExchange: string
  exchangePriority: string[] // 交易所优先级
  
  // 风险控制
  maxDailyLoss: number
  maxPositionSize: number
  minConfidence: number
  maxLeverage: number
  
  // 信号过滤
  allowedStrategies: string[]
  blockedSymbols: string[]
  tradingHours: {
    start: string // "09:00"
    end: string   // "17:00"
    timezone: string // "Asia/Shanghai"
  }
  
  // 通知设置
  notifications: {
    email: boolean
    telegram: boolean
    webhook: boolean
  }
}

export interface SignalHistory {
  id: string
  signal: TradingViewSignal
  tradeSignal: TradeSignal
  riskCheck: RiskCheckResult
  executionResult: ExecutionResult
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'FAILED'
  createdAt: Date
  updatedAt: Date
} 