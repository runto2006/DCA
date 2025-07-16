import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { calculateStrategyScore } from '@/lib/indicators'

// 获取策略评分
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // 如果没有 Supabase 配置，返回模拟数据
    if (!supabaseAdmin) {
      console.warn('Supabase configuration missing, returning mock data')
      return NextResponse.json({
        emaScore: 65,
        obvScore: 72,
        rsiScore: 58,
        macdScore: 68,
        totalScore: 66,
        recommendation: 'BUY',
        current_price: 98.45,
        timestamp: new Date().toISOString(),
        isMock: true
      })
    }

    try {
      // 获取最新的技术指标数据
      const { data: indicators, error: indicatorsError } = await supabaseAdmin
        .from('latest_technical_indicators')
        .select('*')
        .eq('symbol', 'SOL')
        .single()
      
      if (indicatorsError || !indicators) {
        console.warn('No technical indicators found, returning mock data')
        return NextResponse.json({
          emaScore: 50,
          obvScore: 50,
          rsiScore: 50,
          macdScore: 50,
          totalScore: 50,
          recommendation: 'HOLD',
          current_price: 0,
          timestamp: new Date().toISOString(),
          isMock: true
        })
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
        indicators.ema_89 || 0,
        indicators.obv || 0,
        obvPrev || 0,
        indicators.rsi || 50,
        indicators.macd || 0,
        indicators.macd_signal || 0
      )
      
      // 保存策略评分到数据库
      try {
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
      } catch (dbError) {
        console.warn('Failed to save strategy score to database:', dbError)
      }
      
      return NextResponse.json({
        emaScore: score.emaScore,
        obvScore: score.obvScore,
        rsiScore: score.rsiScore,
        macdScore: score.macdScore,
        totalScore: score.totalScore,
        recommendation: score.recommendation,
        current_price: currentPrice,
        timestamp: new Date().toISOString(),
        isMock: false
      })
    } catch (dbError) {
      console.warn('Database error, returning mock data:', dbError)
      return NextResponse.json({
        emaScore: 50,
        obvScore: 50,
        rsiScore: 50,
        macdScore: 50,
        totalScore: 50,
        recommendation: 'HOLD',
        current_price: 0,
        timestamp: new Date().toISOString(),
        isMock: true
      })
    }
  } catch (error) {
    console.error('计算策略评分失败:', error)
    // 返回默认数据而不是错误
    return NextResponse.json({
      emaScore: 50,
      obvScore: 50,
      rsiScore: 50,
      macdScore: 50,
      totalScore: 50,
      recommendation: 'HOLD',
      current_price: 0,
      timestamp: new Date().toISOString(),
      isMock: true
    })
  }
} 