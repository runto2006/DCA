# TradingView警报信号接收功能设计

## 🎯 功能概述

实现一个统一的TradingView警报信号接收系统，支持多交易所自动交易执行，包括信号解析、风险控制、订单管理和执行监控。

---

## 🏗️ 系统架构设计

### 核心组件
```
TradingView Webhook → 信号接收器 → 信号解析器 → 风险控制器 → 订单管理器 → 多交易所执行器
```

### 数据流
1. **信号接收**: TradingView发送Webhook到我们的API
2. **信号解析**: 解析信号格式，提取交易信息
3. **风险控制**: 检查信号可信度、资金安全、风险限制
4. **订单管理**: 生成交易订单，设置止损止盈
5. **多交易所执行**: 根据配置在多个交易所执行订单
6. **结果反馈**: 返回执行结果，更新交易记录

---

## 📋 详细设计

### 1. 信号接收API设计

```typescript
// app/api/tradingview/webhook/route.ts
export async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const signal = await req.json()
    
    // 验证信号格式
    const validatedSignal = await validateTradingViewSignal(signal)
    
    // 解析信号
    const tradeSignal = parseTradingViewSignal(validatedSignal)
    
    // 风险控制检查
    const riskCheck = await performRiskCheck(tradeSignal)
    if (!riskCheck.approved) {
      return res.status(400).json({
        success: false,
        error: '风险控制未通过',
        details: riskCheck.reasons
      })
    }
    
    // 执行交易
    const executionResult = await executeTradeSignal(tradeSignal)
    
    return res.json({
      success: true,
      data: executionResult,
      message: '信号处理完成'
    })
  } catch (error) {
    console.error('TradingView信号处理错误:', error)
    return res.status(500).json({
      success: false,
      error: '信号处理失败'
    })
  }
}
```

### 2. TradingView信号格式

```typescript
// lib/tradingview/signal-types.ts
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
```

### 3. 信号解析器

```typescript
// lib/tradingview/signal-parser.ts
export class TradingViewSignalParser {
  parseSignal(rawSignal: any): TradeSignal {
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
    
    return rawSignal as TradingViewSignal
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
      strategy: 'alert'
    }
  }
}
```

### 4. 风险控制系统

```typescript
// lib/tradingview/risk-controller.ts
export class TradingViewRiskController {
  private maxDailyLoss = 1000 // 最大日亏损
  private maxPositionSize = 0.1 // 最大仓位比例
  private minConfidence = 70 // 最小可信度
  private maxLeverage = 5 // 最大杠杆
  
  async performRiskCheck(signal: TradeSignal): Promise<RiskCheckResult> {
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
      reasons: failedChecks.map(check => check.reason),
      riskScore: this.calculateRiskScore(checks),
      recommendations: this.generateRecommendations(failedChecks)
    }
  }
  
  private async checkDailyLoss(): Promise<RiskCheck> {
    const today = new Date().toISOString().split('T')[0]
    const dailyPnL = await this.getDailyPnL(today)
    
    return {
      passed: dailyPnL > -this.maxDailyLoss,
      reason: dailyPnL <= -this.maxDailyLoss ? 
        `日亏损已达限制: ${dailyPnL}` : undefined
    }
  }
  
  private async checkPositionSize(signal: TradeSignal): Promise<RiskCheck> {
    const accountBalance = await this.getAccountBalance(signal.exchange)
    const positionValue = signal.quantity * (signal.price || 0)
    const positionRatio = positionValue / accountBalance
    
    return {
      passed: positionRatio <= this.maxPositionSize,
      reason: positionRatio > this.maxPositionSize ? 
        `仓位过大: ${(positionRatio * 100).toFixed(2)}%` : undefined
    }
  }
  
  private checkSignalConfidence(signal: TradeSignal): Promise<RiskCheck> {
    return Promise.resolve({
      passed: signal.confidence >= this.minConfidence,
      reason: signal.confidence < this.minConfidence ? 
        `信号可信度过低: ${signal.confidence}%` : undefined
    })
  }
}
```

### 5. 订单执行器

```typescript
// lib/tradingview/order-executor.ts
export class TradingViewOrderExecutor {
  private exchangeManager: ExchangeManager
  
  constructor() {
    this.exchangeManager = new ExchangeManager()
  }
  
  async executeTradeSignal(signal: TradeSignal): Promise<ExecutionResult> {
    try {
      // 获取交易所适配器
      const exchange = this.exchangeManager.getExchange(signal.exchange)
      if (!exchange) {
        throw new Error(`交易所 ${signal.exchange} 不可用`)
      }
      
      // 执行主订单
      const mainOrder = await this.executeMainOrder(exchange, signal)
      
      // 执行止损订单
      const stopLossOrder = signal.stopLoss ? 
        await this.executeStopLossOrder(exchange, signal, mainOrder) : null
      
      // 执行止盈订单
      const takeProfitOrder = signal.takeProfit ? 
        await this.executeTakeProfitOrder(exchange, signal, mainOrder) : null
      
      // 记录交易
      await this.recordTrade(signal, mainOrder, stopLossOrder, takeProfitOrder)
      
      return {
        success: true,
        mainOrder,
        stopLossOrder,
        takeProfitOrder,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('订单执行失败:', error)
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      }
    }
  }
  
  private async executeMainOrder(exchange: ExchangeInterface, signal: TradeSignal): Promise<OrderResult> {
    const orderRequest: OrderRequest = {
      symbol: signal.symbol,
      side: signal.action,
      type: signal.orderType,
      quantity: signal.quantity,
      price: signal.price,
      timeInForce: 'GTC'
    }
    
    if (signal.leverage && signal.leverage > 1) {
      // 设置杠杆
      await exchange.setLeverage(signal.symbol, signal.leverage)
    }
    
    return await exchange.placeOrder(orderRequest)
  }
  
  private async executeStopLossOrder(
    exchange: ExchangeInterface, 
    signal: TradeSignal, 
    mainOrder: OrderResult
  ): Promise<OrderResult | null> {
    if (!signal.stopLoss) return null
    
    const stopOrderRequest: OrderRequest = {
      symbol: signal.symbol,
      side: signal.action === 'BUY' ? 'SELL' : 'BUY',
      type: 'STOP_MARKET',
      quantity: signal.quantity,
      stopPrice: signal.stopLoss,
      timeInForce: 'GTC'
    }
    
    return await exchange.placeOrder(stopOrderRequest)
  }
}
```

### 6. 配置管理

```typescript
// lib/tradingview/config-manager.ts
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

export class TradingViewConfigManager {
  private static instance: TradingViewConfigManager
  private config: TradingViewConfig
  
  static getInstance(): TradingViewConfigManager {
    if (!this.instance) {
      this.instance = new TradingViewConfigManager()
    }
    return this.instance
  }
  
  async loadConfig(): Promise<TradingViewConfig> {
    // 从数据库或配置文件加载
    const config = await this.loadFromDatabase()
    this.config = { ...this.getDefaultConfig(), ...config }
    return this.config
  }
  
  async updateConfig(updates: Partial<TradingViewConfig>): Promise<void> {
    this.config = { ...this.config, ...updates }
    await this.saveToDatabase(this.config)
  }
}
```

---

## 🎛️ 用户界面设计

### 1. TradingView设置面板

```typescript
// components/TradingViewSettings.tsx
export function TradingViewSettings() {
  const [config, setConfig] = useState<TradingViewConfig>()
  const [loading, setLoading] = useState(false)
  
  const handleSave = async (newConfig: TradingViewConfig) => {
    setLoading(true)
    try {
      await fetch('/api/tradingview/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })
      setConfig(newConfig)
    } catch (error) {
      console.error('保存配置失败:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">TradingView信号设置</h2>
      
      {/* 基础设置 */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">基础配置</h3>
        <div className="space-y-4">
          <div>
            <label>启用TradingView信号</label>
            <Switch 
              checked={config?.enabled} 
              onCheckedChange={(enabled) => 
                setConfig(prev => ({ ...prev, enabled }))
              }
            />
          </div>
          <div>
            <label>Webhook URL</label>
            <Input 
              value={config?.webhookUrl} 
              onChange={(e) => 
                setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
              }
              placeholder="https://your-domain.com/api/tradingview/webhook"
            />
          </div>
        </div>
      </Card>
      
      {/* 交易所设置 */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">交易所配置</h3>
        <div className="space-y-4">
          <div>
            <label>默认交易所</label>
            <Select 
              value={config?.defaultExchange}
              onValueChange={(exchange) => 
                setConfig(prev => ({ ...prev, defaultExchange: exchange }))
              }
            >
              <SelectItem value="binance">Binance</SelectItem>
              <SelectItem value="okx">OKX</SelectItem>
              <SelectItem value="bybit">Bybit</SelectItem>
              <SelectItem value="gate">Gate.io</SelectItem>
            </Select>
          </div>
        </div>
      </Card>
      
      {/* 风险控制 */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">风险控制</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>最大日亏损 (USDT)</label>
            <Input 
              type="number"
              value={config?.maxDailyLoss}
              onChange={(e) => 
                setConfig(prev => ({ ...prev, maxDailyLoss: parseFloat(e.target.value) }))
              }
            />
          </div>
          <div>
            <label>最大仓位比例 (%)</label>
            <Input 
              type="number"
              value={config?.maxPositionSize * 100}
              onChange={(e) => 
                setConfig(prev => ({ ...prev, maxPositionSize: parseFloat(e.target.value) / 100 }))
              }
            />
          </div>
        </div>
      </Card>
      
      <Button onClick={() => handleSave(config)} disabled={loading}>
        {loading ? '保存中...' : '保存配置'}
      </Button>
    </div>
  )
}
```

### 2. 信号历史记录

```typescript
// components/TradingViewSignalHistory.tsx
export function TradingViewSignalHistory() {
  const [signals, setSignals] = useState<TradingViewSignal[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchSignalHistory()
  }, [])
  
  const fetchSignalHistory = async () => {
    try {
      const response = await fetch('/api/tradingview/signals')
      const data = await response.json()
      setSignals(data.data)
    } catch (error) {
      console.error('获取信号历史失败:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">信号历史</h2>
      
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div className="space-y-2">
          {signals.map(signal => (
            <SignalCard key={signal.timestamp} signal={signal} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 🔧 实现步骤

### 阶段1: 基础架构 (1-2天)
1. 创建TradingView信号类型定义
2. 实现信号接收API
3. 创建信号解析器
4. 添加基础风险控制

### 阶段2: 订单执行 (2-3天)
1. 实现订单执行器
2. 集成多交易所支持
3. 添加止损止盈功能
4. 实现订单管理

### 阶段3: 高级功能 (2-3天)
1. 完善风险控制系统
2. 添加信号过滤功能
3. 实现通知系统
4. 创建用户界面

### 阶段4: 测试优化 (1-2天)
1. 功能测试
2. 性能优化
3. 安全测试
4. 文档完善

---

## 🎯 推荐实现方案

基于我们已有的多交易所架构，我推荐采用**统一Webhook接口**模式：

### 优势
1. **复用现有架构**: 利用已实现的多交易所适配器
2. **灵活配置**: 用户可以选择在哪个交易所执行
3. **风险分散**: 可以在多个交易所分散执行
4. **统一管理**: 所有交易记录统一管理
5. **扩展性强**: 容易添加新的交易所支持

### 核心特性
- **多交易所支持**: 支持Binance、OKX、Bybit、Gate.io
- **智能路由**: 根据价格、流动性自动选择最优交易所
- **风险控制**: 完善的资金管理和风险控制
- **实时监控**: 订单执行状态实时监控
- **历史记录**: 完整的信号和交易历史

这个方案既保持了系统的统一性，又充分利用了我们已有的多交易所架构优势。

您觉得这个设计方案如何？我们可以立即开始实现吗？ 