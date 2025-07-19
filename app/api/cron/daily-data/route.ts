import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { calculateEMA, calculateRSI, calculateOBV, calculateMACD } from '@/lib/indicators'
import axios from 'axios'

// 获取历史价格数据用于计算技术指标
async function getHistoricalPrices(supabase: any, symbol: string, days: number = 100) {
  const { data, error } = await supabase
    .from('price_data')
    .select('price, volume_24h, timestamp')
    .eq('symbol', symbol)
    .order('timestamp', { ascending: true })
    .limit(days)
  
  if (error) {
    console.error('获取历史价格数据失败:', error)
    return null
  }
  
  return data
}

// 计算技术指标
function calculateIndicators(prices: any[]) {
  if (prices.length < 89) {
    console.warn('价格数据不足，无法计算技术指标')
    return null
  }
  
  const priceValues = prices.map(p => p.price)
  const volumeValues = prices.map(p => p.volume_24h || 0)
  
  // 计算各种技术指标
  const ema89 = calculateEMA(priceValues, 89)
  const rsi = calculateRSI(priceValues, 14)
  const obv = calculateOBV(priceValues, volumeValues)
  const macd = calculateMACD(priceValues, 12, 26, 9)
  
  // 获取最新的指标值
  const latestIndex = priceValues.length - 1
  const ema89Index = Math.max(0, latestIndex - (priceValues.length - ema89.length))
  const rsiIndex = Math.max(0, latestIndex - (priceValues.length - rsi.length))
  const obvIndex = Math.max(0, latestIndex - (priceValues.length - obv.length))
  const macdIndex = Math.max(0, macd.macd.length - 1)
  
  return {
    ema_89: ema89[ema89Index] || 0,
    rsi: rsi[rsiIndex] || 50,
    obv: obv[obvIndex] || 0,
    macd: macd.macd[macdIndex] || 0,
    macd_signal: macd.signal[macdIndex] || 0,
    macd_histogram: macd.histogram[macdIndex] || 0
  }
}

// 定时任务：收集数据并计算技术指标
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase 配置缺失' }, { status: 500 })
    }
    
    // 获取最新的价格数据
    const { data: latestPrice, error: priceError } = await supabaseAdmin
      .from('latest_price_data')
      .select('*')
      .eq('symbol', 'SOL')
      .single()
    
    if (priceError || !latestPrice) {
      console.warn('没有找到价格数据')
      return NextResponse.json({ error: '没有找到价格数据' }, { status: 404 })
    }
    
    // 检查是否已经有今天的技术指标数据
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: existingIndicators } = await supabaseAdmin
      .from('technical_indicators')
      .select('id')
      .eq('symbol', 'SOL')
      .gte('timestamp', today.toISOString())
      .limit(1)
    
    if (existingIndicators && existingIndicators.length > 0) {
      console.log('今天的技术指标数据已存在')
      return NextResponse.json({ message: '技术指标数据已存在' })
    }
    
    // 获取历史价格数据
    const historicalPrices = await getHistoricalPrices(supabaseAdmin, 'SOL', 100)
    
    if (!historicalPrices) {
      return NextResponse.json({ error: '无法获取历史价格数据' }, { status: 500 })
    }
    
    // 计算技术指标
    const indicators = calculateIndicators(historicalPrices)
    
    if (!indicators) {
      return NextResponse.json({ error: '计算技术指标失败' }, { status: 500 })
    }
    
    // 保存技术指标到数据库
    const { error: insertError } = await supabaseAdmin
      .from('technical_indicators')
      .insert({
        symbol: 'SOL',
        ema_89: indicators.ema_89,
        obv: indicators.obv,
        rsi: indicators.rsi,
        macd: indicators.macd,
        macd_signal: indicators.macd_signal,
        macd_histogram: indicators.macd_histogram
      })
    
    if (insertError) {
      console.error('保存技术指标失败:', insertError)
      return NextResponse.json({ error: '保存技术指标失败' }, { status: 500 })
    }
    
    console.log('技术指标计算完成:', indicators)
    
    return NextResponse.json({
      message: '技术指标计算完成',
      indicators,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('定时任务执行失败:', error)
    return NextResponse.json(
      { error: '定时任务执行失败' },
      { status: 500 }
    )
  }
} 