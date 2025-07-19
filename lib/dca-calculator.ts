// DCA加仓幅度计算器
// 基于技术指标动态计算加仓幅度

export interface DCAMarketConditions {
  currentPrice: number
  ema89: number
  rsi: number
  volatility: number
  pricePosition: number // 价格在历史高低点之间的位置 (0-100)
  macd: number
  macdSignal: number
  obv: number
  obvPrev: number
  support: number
  resistance: number
}

export interface DCAMultiplierConfig {
  baseMultiplier: number // 基础乘数
  rsiWeight: number // RSI权重
  volatilityWeight: number // 波动率权重
  pricePositionWeight: number // 价格位置权重
  macdWeight: number // MACD权重
  supportResistanceWeight: number // 支撑阻力权重
}

// 默认配置
export const DEFAULT_DCA_CONFIG: DCAMultiplierConfig = {
  baseMultiplier: 1.5,
  rsiWeight: 0.2,
  volatilityWeight: 0.25,
  pricePositionWeight: 0.2,
  macdWeight: 0.15,
  supportResistanceWeight: 0.2
}

// 计算RSI对加仓幅度的影响
function calculateRSIMultiplier(rsi: number): number {
  // RSI < 30: 超卖，增加加仓幅度 (1.8-2.2)
  // RSI 30-70: 正常区间，标准加仓幅度 (1.3-1.7)
  // RSI > 70: 超买，减少加仓幅度 (1.0-1.4)
  
  if (rsi < 30) {
    // 超卖区域，激进加仓
    const intensity = (30 - rsi) / 30 // 0-1
    return 1.8 + (intensity * 0.4) // 1.8-2.2
  } else if (rsi > 70) {
    // 超买区域，保守加仓
    const intensity = (rsi - 70) / 30 // 0-1
    return 1.4 - (intensity * 0.4) // 1.4-1.0
  } else {
    // 正常区域，标准加仓
    const normalizedRsi = (rsi - 30) / 40 // 0-1
    return 1.3 + (normalizedRsi * 0.4) // 1.3-1.7
  }
}

// 计算波动率对加仓幅度的影响
function calculateVolatilityMultiplier(volatility: number): number {
  // 波动率 < 1%: 低波动，保守加仓 (1.2-1.4)
  // 波动率 1-3%: 正常波动，标准加仓 (1.4-1.6)
  // 波动率 > 3%: 高波动，激进加仓 (1.6-2.0)
  
  if (volatility < 1) {
    // 低波动，保守
    return 1.2 + (volatility * 0.2) // 1.2-1.4
  } else if (volatility > 3) {
    // 高波动，激进
    const intensity = Math.min((volatility - 3) / 2, 1) // 限制在0-1
    return 1.6 + (intensity * 0.4) // 1.6-2.0
  } else {
    // 正常波动
    const normalizedVol = (volatility - 1) / 2 // 0-1
    return 1.4 + (normalizedVol * 0.2) // 1.4-1.6
  }
}

// 计算价格位置对加仓幅度的影响
function calculatePricePositionMultiplier(pricePosition: number): number {
  // 价格位置 < 30%: 接近历史低点，激进加仓 (1.6-2.0)
  // 价格位置 30-70%: 中间区域，标准加仓 (1.3-1.7)
  // 价格位置 > 70%: 接近历史高点，保守加仓 (1.0-1.4)
  
  if (pricePosition < 30) {
    // 接近低点，激进
    const intensity = (30 - pricePosition) / 30 // 0-1
    return 1.6 + (intensity * 0.4) // 1.6-2.0
  } else if (pricePosition > 70) {
    // 接近高点，保守
    const intensity = (pricePosition - 70) / 30 // 0-1
    return 1.4 - (intensity * 0.4) // 1.4-1.0
  } else {
    // 中间区域，标准
    const normalizedPos = (pricePosition - 30) / 40 // 0-1
    return 1.3 + (normalizedPos * 0.4) // 1.3-1.7
  }
}

// 计算MACD对加仓幅度的影响
function calculateMACDMultiplier(macd: number, macdSignal: number): number {
  const macdDiff = macd - macdSignal
  
  // MACD > Signal: 上升趋势，适度加仓 (1.3-1.7)
  // MACD < Signal: 下降趋势，激进加仓 (1.5-2.0)
  // MACD ≈ Signal: 横盘，标准加仓 (1.2-1.6)
  
  if (Math.abs(macdDiff) < 0.1) {
    // 横盘整理
    return 1.2 + (Math.random() * 0.4) // 1.2-1.6
  } else if (macdDiff > 0) {
    // 上升趋势
    const intensity = Math.min(macdDiff / 2, 1) // 限制在0-1
    return 1.3 + (intensity * 0.4) // 1.3-1.7
  } else {
    // 下降趋势，激进加仓
    const intensity = Math.min(Math.abs(macdDiff) / 2, 1) // 限制在0-1
    return 1.5 + (intensity * 0.5) // 1.5-2.0
  }
}

// 计算支撑阻力对加仓幅度的影响
function calculateSupportResistanceMultiplier(
  currentPrice: number,
  support: number,
  resistance: number
): number {
  if (support <= 0 || resistance <= 0) {
    return 1.5 // 默认值
  }
  
  const supportDistance = ((currentPrice - support) / currentPrice) * 100
  const resistanceDistance = ((resistance - currentPrice) / currentPrice) * 100
  
  // 接近支撑位: 激进加仓 (1.6-2.0)
  // 接近阻力位: 保守加仓 (1.0-1.4)
  // 中间位置: 标准加仓 (1.3-1.7)
  
  if (supportDistance < 2) {
    // 接近支撑位
    const intensity = (2 - supportDistance) / 2 // 0-1
    return 1.6 + (intensity * 0.4) // 1.6-2.0
  } else if (resistanceDistance < 2) {
    // 接近阻力位
    const intensity = (2 - resistanceDistance) / 2 // 0-1
    return 1.4 - (intensity * 0.4) // 1.4-1.0
  } else {
    // 中间位置
    const midPoint = (support + resistance) / 2
    const distanceFromMid = Math.abs(currentPrice - midPoint) / midPoint * 100
    const normalizedDistance = Math.min(distanceFromMid / 10, 1) // 0-1
    return 1.3 + (normalizedDistance * 0.4) // 1.3-1.7
  }
}

// 主计算函数：基于市场条件计算动态加仓幅度
export function calculateDynamicDCAMultiplier(
  marketConditions: DCAMarketConditions,
  config: DCAMultiplierConfig = DEFAULT_DCA_CONFIG
): {
  multiplier: number
  breakdown: {
    rsiMultiplier: number
    volatilityMultiplier: number
    pricePositionMultiplier: number
    macdMultiplier: number
    supportResistanceMultiplier: number
    weightedMultiplier: number
  }
  analysis: string
} {
  // 计算各个指标的乘数
  const rsiMultiplier = calculateRSIMultiplier(marketConditions.rsi)
  const volatilityMultiplier = calculateVolatilityMultiplier(marketConditions.volatility)
  const pricePositionMultiplier = calculatePricePositionMultiplier(marketConditions.pricePosition)
  const macdMultiplier = calculateMACDMultiplier(marketConditions.macd, marketConditions.macdSignal)
  const supportResistanceMultiplier = calculateSupportResistanceMultiplier(
    marketConditions.currentPrice,
    marketConditions.support,
    marketConditions.resistance
  )
  
  // 加权计算最终乘数
  const weightedMultiplier = 
    rsiMultiplier * config.rsiWeight +
    volatilityMultiplier * config.volatilityWeight +
    pricePositionMultiplier * config.pricePositionWeight +
    macdMultiplier * config.macdWeight +
    supportResistanceMultiplier * config.supportResistanceWeight
  
  // 应用基础乘数
  const finalMultiplier = config.baseMultiplier * weightedMultiplier
  
  // 限制在合理范围内
  const clampedMultiplier = Math.max(0.8, Math.min(2.5, finalMultiplier))
  
  // 生成分析说明
  const analysis = generateMultiplierAnalysis({
    rsi: marketConditions.rsi,
    volatility: marketConditions.volatility,
    pricePosition: marketConditions.pricePosition,
    macd: marketConditions.macd,
    macdSignal: marketConditions.macdSignal,
    rsiMultiplier,
    volatilityMultiplier,
    pricePositionMultiplier,
    macdMultiplier,
    supportResistanceMultiplier,
    finalMultiplier: clampedMultiplier
  })
  
  return {
    multiplier: clampedMultiplier,
    breakdown: {
      rsiMultiplier,
      volatilityMultiplier,
      pricePositionMultiplier,
      macdMultiplier,
      supportResistanceMultiplier,
      weightedMultiplier
    },
    analysis
  }
}

// 生成乘数分析说明
function generateMultiplierAnalysis(data: any): string {
  const parts = []
  
  // RSI分析
  if (data.rsi < 30) {
    parts.push(`RSI超卖(${data.rsi.toFixed(1)})，增加加仓幅度`)
  } else if (data.rsi > 70) {
    parts.push(`RSI超买(${data.rsi.toFixed(1)})，减少加仓幅度`)
  } else {
    parts.push(`RSI正常(${data.rsi.toFixed(1)})，标准加仓`)
  }
  
  // 波动率分析
  if (data.volatility > 3) {
    parts.push(`高波动率(${data.volatility.toFixed(1)}%)，激进加仓`)
  } else if (data.volatility < 1) {
    parts.push(`低波动率(${data.volatility.toFixed(1)}%)，保守加仓`)
  } else {
    parts.push(`正常波动率(${data.volatility.toFixed(1)}%)`)
  }
  
  // 价格位置分析
  if (data.pricePosition < 30) {
    parts.push(`接近历史低点(${data.pricePosition.toFixed(1)}%)，激进加仓`)
  } else if (data.pricePosition > 70) {
    parts.push(`接近历史高点(${data.pricePosition.toFixed(1)}%)，保守加仓`)
  } else {
    parts.push(`价格位置适中(${data.pricePosition.toFixed(1)}%)`)
  }
  
  // MACD分析
  const macdDiff = data.macd - data.macdSignal
  if (macdDiff > 0.1) {
    parts.push(`MACD上升趋势，适度加仓`)
  } else if (macdDiff < -0.1) {
    parts.push(`MACD下降趋势，激进加仓`)
  } else {
    parts.push(`MACD横盘整理`)
  }
  
  return parts.join('；') + `。最终加仓倍数：${data.finalMultiplier.toFixed(2)}x`
}

// 计算DCA订单详情
export function calculateDCAOrders(
  baseAmount: number,
  maxOrders: number,
  marketConditions: DCAMarketConditions,
  config: DCAMultiplierConfig = DEFAULT_DCA_CONFIG
): {
  orderNumber: number
  amount: number
  multiplier: number
  totalInvested: number
  analysis: string
}[] {
  const orders = []
  let currentAmount = baseAmount
  let totalInvested = 0
  
  for (let i = 0; i < maxOrders; i++) {
    // 计算当前订单的动态乘数
    const { multiplier, analysis } = calculateDynamicDCAMultiplier(marketConditions, config)
    
    orders.push({
      orderNumber: i + 1,
      amount: currentAmount,
      multiplier: multiplier,
      totalInvested: totalInvested + currentAmount,
      analysis: analysis
    })
    
    // 更新下一单的金额
    currentAmount = Math.round(currentAmount * multiplier * 100) / 100
    totalInvested += currentAmount
    
    // 更新市场条件（模拟价格下跌）
    marketConditions.currentPrice *= 0.98 // 假设每次加仓时价格下跌2%
    marketConditions.pricePosition = Math.max(0, marketConditions.pricePosition - 5) // 价格位置下降
  }
  
  return orders
}

// 获取加仓策略建议
export function getDCAMultiplierStrategy(marketConditions: DCAMarketConditions): {
  strategy: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  reason: string
  recommendedMultiplier: number
} {
  const { multiplier } = calculateDynamicDCAMultiplier(marketConditions)
  
  if (multiplier < 1.3) {
    return {
      strategy: 'CONSERVATIVE',
      reason: '市场条件不利，建议保守加仓',
      recommendedMultiplier: multiplier
    }
  } else if (multiplier > 1.8) {
    return {
      strategy: 'AGGRESSIVE',
      reason: '市场条件有利，可以激进加仓',
      recommendedMultiplier: multiplier
    }
  } else {
    return {
      strategy: 'BALANCED',
      reason: '市场条件一般，平衡加仓策略',
      recommendedMultiplier: multiplier
    }
  }
} 