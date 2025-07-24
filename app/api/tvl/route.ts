import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'BTC'
    
    // 生成模拟TVL数据
    const mockTvlData = {
      chain: symbol,
      tvl: Math.random() * 1000000000 + 500000000, // 5-15亿之间
      tvl_change_1d: (Math.random() - 0.5) * 10, // -5% 到 +5%
      tvl_change_7d: (Math.random() - 0.5) * 20, // -10% 到 +10%
      tvl_change_30d: (Math.random() - 0.5) * 30, // -15% 到 +15%
      timestamp: new Date().toISOString(),
      source: 'Mock Data',
      isMock: true
    }
    
    return NextResponse.json(mockTvlData)
  } catch (error) {
    console.error('❌ 获取TVL数据失败:', error)
    return NextResponse.json(
      { error: '获取TVL数据失败' },
      { status: 500 }
    )
  }
} 