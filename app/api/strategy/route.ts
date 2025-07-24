import { NextRequest, NextResponse } from 'next/server'
import { calculateEMA, calculateRSI, calculateOBV, calculateMACD } from '@/lib/indicators'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'SOLUSDT'
    const customSupport = searchParams.get('customSupport')
    const customResistance = searchParams.get('customResistance')
    const historicalHigh = searchParams.get('historicalHigh')
    const historicalLow = searchParams.get('historicalLow')

    // 获取当前价格（模拟数据）
    const currentPrice = await getCurrentPrice(symbol)
    
    // 生成历史价格数据用于计算指标
    const historicalData = generateHistoricalData(currentPrice)
    const volumes = generateVolumes(historicalData.length)
    
    // 计算技术指标
    const ema89Array = calculateEMA(historicalData, 89)
    const rsiArray = calculateRSI(historicalData, 14)
    const obvArray = calculateOBV(historicalData, volumes)
    const macdData = calculateMACD(historicalData, 12, 26, 9)
    
    // 获取最新的指标值
    const ema89 = ema89Array[ema89Array.length - 1] || currentPrice
    const rsi = rsiArray[rsiArray.length - 1] || 50
    const obv = obvArray[obvArray.length - 1] || 0
    const macd = {
      macd: macdData.macd[macdData.macd.length - 1] || 0,
      signal: macdData.signal[macdData.signal.length - 1] || 0
    }
    
    // 计算评分
    const emaScore = calculateEMAScore(currentPrice, ema89)
    const rsiScore = calculateRSIScore(rsi)
    const obvScore = calculateOBVScore(obv, historicalData)
    const macdScore = calculateMACDScore(macd)
    
    // 计算总评分
    const totalScore = Math.round((emaScore + rsiScore + obvScore + macdScore) / 4)
    
    // 生成建议
    const recommendation = generateRecommendation(totalScore)
    const confidence = Math.min(95, Math.max(60, totalScore + Math.random() * 20))
    
    // 计算风险等级
    const riskLevel = calculateRiskLevel(totalScore, currentPrice, ema89)
    const riskScore = calculateRiskScore(totalScore, riskLevel)
    const riskFactors = generateRiskFactors(totalScore, rsi, currentPrice, ema89)
    
    // 计算趋势
    const trend = calculateTrend(currentPrice, ema89, macd)
    
    // 计算支撑阻力位
    const support = customSupport ? parseFloat(customSupport) : calculateSupport(currentPrice, historicalData)
    const resistance = customResistance ? parseFloat(customResistance) : calculateResistance(currentPrice, historicalData)
    
    // 计算波动率
    const volatility = calculateVolatility(historicalData)
    
    // 计算价格位置（用于DCA策略）
    const pricePosition = calculatePricePosition(currentPrice, historicalHigh || undefined, historicalLow || undefined)
    
    // 生成DCA策略
    const dcaStrategy = generateDCAStrategy(currentPrice, pricePosition, support, resistance)
    
    // 生成详细分析
    const detailedAnalysis = generateDetailedAnalysis({
      currentPrice,
      ema89,
      rsi,
      obv,
      macd,
      support,
      resistance,
      trend,
      riskLevel
    })

    const strategyData = {
      emaScore,
      obvScore,
      rsiScore,
      macdScore,
      totalScore,
      recommendation,
      confidence,
      riskLevel,
      riskScore,
      riskFactors,
      trend,
      support,
      resistance,
      volatility,
      current_price: currentPrice,
      timestamp: new Date().toISOString(),
      isMock: true,
      dcaStrategy,
      pricePosition,
      historicalHigh: historicalHigh ? parseFloat(historicalHigh) : undefined,
      historicalLow: historicalLow ? parseFloat(historicalLow) : undefined,
      indicators: {
        ema89: {
          value: ema89,
          period: 89,
          description: `EMA89: ${ema89.toFixed(2)}`
        },
        rsi: {
          value: rsi,
          period: 14,
          description: `RSI14: ${rsi.toFixed(2)}`
        },
        obv: {
          value: obv,
          description: `OBV: ${obv.toLocaleString()}`
        },
        macd: {
          value: macd.macd,
          signal: macd.signal,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          description: `MACD: ${macd.macd.toFixed(4)}, Signal: ${macd.signal.toFixed(4)}`
        }
      },
      detailedAnalysis
    }

    return NextResponse.json(strategyData)
  } catch (error) {
    console.error('获取策略数据失败:', error)
    return NextResponse.json(
      { error: '获取策略数据失败' },
      { status: 500 }
    )
  }
}

// 辅助函数
async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(`http://localhost:3000/api/price?symbol=${symbol}`)
    const data = await response.json()
    return data.success ? data.data.price : generateMockPrice(symbol)
  } catch (error) {
    return generateMockPrice(symbol)
  }
}

function generateMockPrice(symbol: string): number {
  const basePrices: { [key: string]: number } = {
    'SOLUSDT': 190,
    'BTCUSDT': 43000,
    'ETHUSDT': 2600,
    'ADAUSDT': 0.5,
    'DOTUSDT': 7,
    'LINKUSDT': 15,
    'UNIUSDT': 7,
    'MATICUSDT': 0.8
  }
  
  const basePrice = basePrices[symbol] || 100
  return basePrice + (Math.random() - 0.5) * basePrice * 0.1
}

function generateHistoricalData(currentPrice: number): number[] {
  const data: number[] = []
  for (let i = 100; i >= 0; i--) {
    const timeFactor = i / 100
    const volatility = 0.02
    const trend = Math.sin(timeFactor * Math.PI) * 0.05
    const random = (Math.random() - 0.5) * volatility
    const price = currentPrice * (1 + trend + random)
    data.push(price)
  }
  return data
}

function generateVolumes(length: number): number[] {
  const volumes: number[] = []
  for (let i = 0; i < length; i++) {
    volumes.push(1000000 + Math.random() * 5000000)
  }
  return volumes
}

function calculateEMAScore(currentPrice: number, ema89: number): number {
  const deviation = Math.abs(currentPrice - ema89) / ema89
  if (deviation < 0.01) return 95
  if (deviation < 0.02) return 85
  if (deviation < 0.05) return 70
  if (deviation < 0.1) return 50
  return 30
}

function calculateRSIScore(rsi: number): number {
  if (rsi >= 30 && rsi <= 70) return 90
  if (rsi >= 20 && rsi <= 80) return 75
  if (rsi >= 10 && rsi <= 90) return 60
  return 40
}

function calculateOBVScore(obv: number, historicalData: number[]): number {
  const recentOBV = obv
  const olderOBV = obv * 0.95
  const obvTrend = (recentOBV - olderOBV) / olderOBV
  
  if (obvTrend > 0.05) return 90
  if (obvTrend > 0.02) return 80
  if (obvTrend > -0.02) return 70
  if (obvTrend > -0.05) return 60
  return 40
}

function calculateMACDScore(macd: { macd: number; signal: number }): number {
  const macdValue = macd.macd
  const signalValue = macd.signal
  const histogram = macdValue - signalValue
  
  if (histogram > 0 && macdValue > 0) return 90
  if (histogram > 0) return 75
  if (histogram > -0.001) return 60
  return 40
}

function generateRecommendation(totalScore: number): string {
  if (totalScore >= 85) return '强烈买入'
  if (totalScore >= 75) return '买入'
  if (totalScore >= 65) return '谨慎买入'
  if (totalScore >= 55) return '持有'
  if (totalScore >= 45) return '谨慎卖出'
  if (totalScore >= 35) return '卖出'
  return '强烈卖出'
}

function calculateRiskLevel(totalScore: number, currentPrice: number, ema89: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  const priceDeviation = Math.abs(currentPrice - ema89) / ema89
  
  if (totalScore >= 75 && priceDeviation < 0.05) return 'LOW'
  if (totalScore >= 60 && priceDeviation < 0.1) return 'MEDIUM'
  return 'HIGH'
}

function calculateRiskScore(totalScore: number, riskLevel: string): number {
  const baseScore = 100 - totalScore
  const riskMultiplier = riskLevel === 'HIGH' ? 1.5 : riskLevel === 'MEDIUM' ? 1.2 : 1
  return Math.min(100, Math.round(baseScore * riskMultiplier))
}

function generateRiskFactors(totalScore: number, rsi: number, currentPrice: number, ema89: number): string[] {
  const factors: string[] = []
  
  if (totalScore < 60) factors.push('技术指标综合评分较低')
  if (rsi > 80) factors.push('RSI超买，可能存在回调风险')
  if (rsi < 20) factors.push('RSI超卖，可能存在反弹机会')
  
  const priceDeviation = Math.abs(currentPrice - ema89) / ema89
  if (priceDeviation > 0.1) factors.push('价格偏离均线较远')
  
  if (factors.length === 0) factors.push('风险因素较少')
  
  return factors
}

function calculateTrend(currentPrice: number, ema89: number, macd: { macd: number; signal: number }): string {
  const priceTrend = currentPrice > ema89 ? '上升' : '下降'
  const macdTrend = macd.macd > macd.signal ? '上升' : '下降'
  
  if (priceTrend === '上升' && macdTrend === '上升') return '强势上升'
  if (priceTrend === '上升') return '温和上升'
  if (priceTrend === '下降' && macdTrend === '下降') return '强势下降'
  return '温和下降'
}

function calculateSupport(currentPrice: number, historicalData: number[]): number {
  const minPrice = Math.min(...historicalData.slice(-20))
  return Math.round(minPrice * 0.98 * 100) / 100
}

function calculateResistance(currentPrice: number, historicalData: number[]): number {
  const maxPrice = Math.max(...historicalData.slice(-20))
  return Math.round(maxPrice * 1.02 * 100) / 100
}

function calculateVolatility(historicalData: number[]): number {
  const returns = []
  for (let i = 1; i < historicalData.length; i++) {
    returns.push((historicalData[i] - historicalData[i-1]) / historicalData[i-1])
  }
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  return Math.sqrt(variance) * 100
}

function calculatePricePosition(currentPrice: number, historicalHigh?: string, historicalLow?: string): number {
  if (historicalHigh && historicalLow) {
    const high = parseFloat(historicalHigh)
    const low = parseFloat(historicalLow)
    return ((currentPrice - low) / (high - low)) * 100
  }
  
  // 默认计算（基于当前价格的相对位置）
  return 50 + (Math.random() - 0.5) * 40
}

function generateDCAStrategy(
  currentPrice: number, 
  pricePosition: number, 
  support: number, 
  resistance: number
): any {
  let type: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  let maxOrders: number
  let initialAmount: number
  let orderAmount: number
  let priceDeviation: number
  let takeProfit: number
  let amountMultiplier: number
  let deviationMultiplier: number
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  let description: string

  if (pricePosition < 30) {
    // 价格处于低位，采用激进策略
    type = 'AGGRESSIVE'
    maxOrders = 8
    initialAmount = 200
    orderAmount = 150
    priceDeviation = 3
    takeProfit = 15
    amountMultiplier = 1.5
    deviationMultiplier = 1.2
    riskLevel = 'MEDIUM'
    description = '价格处于历史低位，建议采用激进DCA策略，分批建仓'
  } else if (pricePosition > 70) {
    // 价格处于高位，采用保守策略
    type = 'CONSERVATIVE'
    maxOrders = 4
    initialAmount = 100
    orderAmount = 80
    priceDeviation = 5
    takeProfit = 8
    amountMultiplier = 1.2
    deviationMultiplier = 1.1
    riskLevel = 'LOW'
    description = '价格处于历史高位，建议采用保守DCA策略，谨慎建仓'
  } else {
    // 价格处于中位，采用平衡策略
    type = 'BALANCED'
    maxOrders = 6
    initialAmount = 150
    orderAmount = 120
    priceDeviation = 4
    takeProfit = 12
    amountMultiplier = 1.3
    deviationMultiplier = 1.15
    riskLevel = 'MEDIUM'
    description = '价格处于历史中位，建议采用平衡DCA策略，稳健建仓'
  }

  const totalInvestment = initialAmount + (orderAmount * (maxOrders - 1))

  return {
    type,
    pricePosition,
    maxOrders,
    initialAmount,
    orderAmount,
    priceDeviation,
    takeProfit,
    stopLoss: support * 0.9,
    amountMultiplier,
    deviationMultiplier,
    totalInvestment,
    description,
    riskLevel
  }
}

function generateDetailedAnalysis(data: any): any {
  const { currentPrice, ema89, rsi, obv, macd, support, resistance, trend, riskLevel } = data

  return {
    emaAnalysis: `当前价格 ${currentPrice.toFixed(2)} 与EMA89 ${ema89.toFixed(2)} 的偏离度为 ${Math.abs(currentPrice - ema89 / ema89 * 100).toFixed(2)}%。${currentPrice > ema89 ? '价格在均线之上，趋势向好' : '价格在均线之下，需要关注支撑位'}`,
    obvAnalysis: `OBV指标显示 ${obv > 0 ? '资金流入，买盘较强' : '资金流出，卖盘较强'}，与价格走势 ${trend.includes('上升') ? '一致' : '背离'}。`,
    rsiAnalysis: `RSI指标为 ${rsi.toFixed(2)}，${rsi > 70 ? '处于超买区域，注意回调风险' : rsi < 30 ? '处于超卖区域，可能存在反弹机会' : '处于正常区间，市场相对平衡'}`,
    macdAnalysis: `MACD指标 ${macd.macd > 0 ? '为正' : '为负'}，信号线 ${macd.signal > 0 ? '为正' : '为负'}，${macd.macd > macd.signal ? 'MACD在信号线之上，趋势向上' : 'MACD在信号线之下，趋势向下'}`,
    trendAnalysis: `当前趋势为${trend}，支撑位 ${support.toFixed(2)}，阻力位 ${resistance.toFixed(2)}，建议在支撑位附近买入，阻力位附近卖出。`,
    riskAnalysis: `风险等级为${riskLevel}，${riskLevel === 'HIGH' ? '建议谨慎操作，控制仓位' : riskLevel === 'MEDIUM' ? '建议适度操作，注意风险控制' : '风险相对较低，可以适当增加仓位'}`,
    dcaAnalysis: `基于当前价格位置，建议采用${data.dcaStrategy?.type}策略，${data.dcaStrategy?.description}`
  }
} 