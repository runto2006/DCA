import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateEMA, calculateRSI, calculateOBV, calculateMACD } from '@/lib/indicators'
import axios from 'axios'

// 每日数据抓取定时任务
export async function GET() {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 获取SOL历史价格数据（最近100天）
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=100&interval=daily'
    )
    
    const prices = response.data.prices.map((p: [number, number]) => p[1])
    const volumes = response.data.total_volumes.map((v: [number, number]) => v[1])
    
    // 计算技术指标
    const ema89 = calculateEMA(prices, 89)
    const rsi = calculateRSI(prices, 14)
    const obv = calculateOBV(prices, volumes)
    const macdData = calculateMACD(prices)
    
    // 获取最新数据
    const latestPrice = prices[prices.length - 1]
    const latestVolume = volumes[volumes.length - 1]
    const latestEma89 = ema89[ema89.length - 1]
    const latestRsi = rsi[rsi.length - 1]
    const latestObv = obv[obv.length - 1]
    const latestMacd = macdData.macd[macdData.macd.length - 1]
    const latestMacdSignal = macdData.signal[macdData.signal.length - 1]
    const latestMacdHistogram = macdData.histogram[macdData.histogram.length - 1]
    
    // 保存价格数据
    await supabaseAdmin
      .from('price_data')
      .insert({
        symbol: 'SOL',
        price: latestPrice,
        volume_24h: latestVolume,
        market_cap: latestPrice * 400000000, // 估算市值
        timestamp: new Date().toISOString()
      })
    
    // 保存技术指标数据
    await supabaseAdmin
      .from('technical_indicators')
      .insert({
        symbol: 'SOL',
        ema_89: latestEma89,
        obv: latestObv,
        rsi: latestRsi,
        macd: latestMacd,
        macd_signal: latestMacdSignal,
        macd_histogram: latestMacdHistogram,
        timestamp: new Date().toISOString()
      })
    
    return NextResponse.json({
      success: true,
      message: '每日数据抓取完成',
      timestamp: new Date().toISOString(),
      data: {
        price: latestPrice,
        ema_89: latestEma89,
        rsi: latestRsi,
        obv: latestObv,
        macd: latestMacd
      }
    })
  } catch (error) {
    console.error('每日数据抓取失败:', error)
    return NextResponse.json(
      { error: '每日数据抓取失败' },
      { status: 500 }
    )
  }
} 