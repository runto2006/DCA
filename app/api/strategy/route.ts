import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateStrategyScore } from '@/lib/indicators'

// 获取策略评分
export async function GET() {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 获取最新的技术指标数据
    const { data: indicators, error: indicatorsError } = await supabaseAdmin
      .from('latest_technical_indicators')
      .select('*')
      .eq('symbol', 'SOL')
      .single()
    
    if (indicatorsError || !indicators) {
      return NextResponse.json(
        { error: '未找到技术指标数据' },
        { status: 404 }
      )
    }
    
    // 获取前一个时间点的OBV数据用于计算变化
    const { data: prevIndicators } = await supabaseAdmin
      .from('technical_indicators')
      .select('obv')
      .eq('symbol', 'SOL')
      .order('timestamp', { ascending: false })
      .range(1, 2)
    
    const obvPrev = prevIndicators?.[0]?.obv || indicators.obv
    
    // 获取当前价格
    const { data: priceData } = await supabaseAdmin
      .from('latest_price_data')
      .select('price')
      .eq('symbol', 'SOL')
      .single()
    
    const currentPrice = priceData?.price || 0
    
    // 计算策略评分
    const score = calculateStrategyScore(
      currentPrice,
      indicators.ema_89,
      indicators.obv,
      obvPrev,
      indicators.rsi,
      indicators.macd,
      indicators.macd_signal
    )
    
    // 保存策略评分到数据库
    await supabaseAdmin
      .from('strategy_scores')
      .insert({
        symbol: 'SOL',
        ema_score: score.emaScore,
        obv_score: score.obvScore,
        rsi_score: score.rsiScore,
        macd_score: score.macdScore,
        total_score: score.totalScore,
        recommendation: score.recommendation
      })
    
    return NextResponse.json({
      ...score,
      current_price: currentPrice,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('计算策略评分失败:', error)
    return NextResponse.json(
      { error: '计算策略评分失败' },
      { status: 500 }
    )
  }
} 