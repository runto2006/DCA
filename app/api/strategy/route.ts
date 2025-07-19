import { NextResponse } from 'next/server'
import { calculateEMA, calculateRSI, calculateOBV, calculateMACD, calculateStrategyScore, calculateEnhancedStrategyScore } from '@/lib/indicators'

interface BinanceKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
  quoteAssetVolume: string
  numberOfTrades: number
  takerBuyBaseAssetVolume: string
  takerBuyQuoteAssetVolume: string
  ignore: string
}

// 获取币安历史K线数据
async function getBinanceKlines(symbol: string = 'SOLUSDT', interval: string = '1h', limit: number = 200): Promise<BinanceKline[]> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`币安API请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    return data.map((kline: any[]) => ({
      openTime: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      closeTime: kline[6],
      quoteAssetVolume: kline[7],
      numberOfTrades: kline[8],
      takerBuyBaseAssetVolume: kline[9],
      takerBuyQuoteAssetVolume: kline[10],
      ignore: kline[11]
    }))
  } catch (error) {
    console.error('获取币安K线数据失败:', error)
    throw error
  }
}

// 获取当前价格
async function getCurrentPrice(symbol: string = 'SOLUSDT'): Promise<number> {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`获取价格失败: ${response.status}`)
    }
    
    const data = await response.json()
    return parseFloat(data.price)
  } catch (error) {
    console.error('获取当前价格失败:', error)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    console.log('开始计算增强策略评分...')
    
    // 获取URL参数
    const { searchParams } = new URL(request.url)
    const customSupport = searchParams.get('customSupport')
    const customResistance = searchParams.get('customResistance')
    const historicalHigh = searchParams.get('historicalHigh')
    const historicalLow = searchParams.get('historicalLow')
    
    console.log('策略参数:', { customSupport, customResistance, historicalHigh, historicalLow })
    
    // 获取历史K线数据
    const klines = await getBinanceKlines('SOLUSDT', '1h', 200)
    
    if (klines.length < 100) {
      throw new Error('历史数据不足，无法计算技术指标')
    }
    
    // 提取价格和成交量数据
    const prices = klines.map(k => parseFloat(k.close))
    const volumes = klines.map(k => parseFloat(k.volume))
    const currentPrice = prices[prices.length - 1]
    
    console.log(`获取到 ${klines.length} 条历史数据，当前价格: $${currentPrice}`)
    
    // 计算技术指标
    const ema89 = calculateEMA(prices, 89)
    const rsi = calculateRSI(prices, 14)
    const obv = calculateOBV(prices, volumes)
    const macd = calculateMACD(prices, 12, 26, 9)
    
    // 获取最新的指标值
    const latestEma89 = ema89[ema89.length - 1] || currentPrice
    const latestRsi = rsi[rsi.length - 1] || 50
    const latestObv = obv[obv.length - 1] || 0
    const prevObv = obv[obv.length - 2] || latestObv
    const latestMacd = macd.macd[macd.macd.length - 1] || 0
    const latestMacdSignal = macd.signal[macd.signal.length - 1] || 0
    
    console.log('技术指标计算结果:', {
      ema89: latestEma89,
      rsi: latestRsi,
      obv: latestObv,
      macd: latestMacd,
      macdSignal: latestMacdSignal
    })
    
    // 处理自定义支撑阻力位
    let customSupportValue = 0
    let customResistanceValue = 0
    
    if (customSupport && customResistance) {
      const customSupportNum = parseFloat(customSupport)
      const customResistanceNum = parseFloat(customResistance)
      
      if (!isNaN(customSupportNum) && !isNaN(customResistanceNum) && customSupportNum < customResistanceNum) {
        customSupportValue = customSupportNum
        customResistanceValue = customResistanceNum
        console.log('使用自定义支撑阻力位:', { customSupportValue, customResistanceValue })
      }
    }
    
    // 处理历史高低价
    let historicalHighValue = 0
    let historicalLowValue = 0
    
    if (historicalHigh && historicalLow) {
      const historicalHighNum = parseFloat(historicalHigh)
      const historicalLowNum = parseFloat(historicalLow)
      
      if (!isNaN(historicalHighNum) && !isNaN(historicalLowNum) && historicalHighNum > historicalLowNum) {
        historicalHighValue = historicalHighNum
        historicalLowValue = historicalLowNum
        console.log('使用自定义历史高低价:', { historicalHighValue, historicalLowValue })
      }
    } else {
      // 如果没有提供历史高低价，使用最近90天的数据计算
      const recentPrices = prices.slice(-90)
      historicalHighValue = Math.max(...recentPrices)
      historicalLowValue = Math.min(...recentPrices)
      console.log('使用自动计算的历史高低价:', { historicalHighValue, historicalLowValue })
    }
    
    // 使用增强的策略评分计算（包含DCA策略）
    const score = calculateEnhancedStrategyScore(
      currentPrice,
      latestEma89,
      latestObv,
      prevObv,
      latestRsi,
      latestMacd,
      latestMacdSignal,
      prices, // 传递价格历史数据
      volumes,  // 传递成交量历史数据
      customSupportValue, // 自定义支撑位
      customResistanceValue, // 自定义阻力位
      historicalHighValue, // 历史最高价
      historicalLowValue // 历史最低价
    )
    
    console.log('增强策略评分结果:', score)
    
    return NextResponse.json({
      emaScore: score.emaScore,
      obvScore: score.obvScore,
      rsiScore: score.rsiScore,
      macdScore: score.macdScore,
      totalScore: score.totalScore,
      recommendation: score.recommendation,
      confidence: score.confidence,
      riskLevel: score.riskLevel,
      riskScore: score.riskScore,
      riskFactors: score.riskFactors,
      trend: score.trend,
      support: score.support,
      resistance: score.resistance,
      volatility: score.volatility,
      current_price: currentPrice,
      timestamp: new Date().toISOString(),
      isMock: false,
      // DCA策略信息
      dcaStrategy: score.dcaStrategy,
      pricePosition: score.pricePosition,
      historicalHigh: historicalHighValue,
      historicalLow: historicalLowValue,
      // 添加技术指标值和周期信息
      indicators: {
        ema89: {
          value: latestEma89,
          period: 89,
          description: '指数移动平均线'
        },
        rsi: {
          value: latestRsi,
          period: 14,
          description: '相对强弱指数'
        },
        obv: {
          value: latestObv,
          description: '能量潮指标'
        },
        macd: {
          value: latestMacd,
          signal: latestMacdSignal,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          description: '移动平均收敛发散'
        }
      },
      // 添加详细分析
      detailedAnalysis: score.detailedAnalysis
    })
    
  } catch (error) {
    console.error('计算策略评分失败:', error)
    
    // 返回模拟数据作为备用
    return NextResponse.json({
      emaScore: 50,
      obvScore: 50,
      rsiScore: 50,
      macdScore: 50,
      totalScore: 50,
      recommendation: 'HOLD',
      confidence: 50,
      riskLevel: 'MEDIUM',
      riskScore: 30,
      riskFactors: ['数据不足，无法准确评估风险'],
      trend: 'SIDEWAYS',
      support: 0,
      resistance: 0,
      volatility: 0,
      current_price: 0,
      timestamp: new Date().toISOString(),
      isMock: true,
      dcaStrategy: {
        type: 'BALANCED',
        pricePosition: 50,
        maxOrders: 6,
        initialAmount: 80,
        orderAmount: 80,
        priceDeviation: 1.5,
        takeProfit: 1.2,
        amountMultiplier: 1.5,
        deviationMultiplier: 1.2,
        totalInvestment: 800,
        description: '默认平衡策略',
        riskLevel: 'MEDIUM'
      },
      pricePosition: 50,
      historicalHigh: 0,
      historicalLow: 0,
      error: error instanceof Error ? error.message : '未知错误',
      detailedAnalysis: {
        emaAnalysis: '数据不足，无法分析',
        obvAnalysis: '数据不足，无法分析',
        rsiAnalysis: '数据不足，无法分析',
        macdAnalysis: '数据不足，无法分析',
        trendAnalysis: '数据不足，无法分析',
        riskAnalysis: '数据不足，无法分析',
        dcaAnalysis: '数据不足，无法分析'
      }
    })
  }
} 