import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'BTC'
    const days = parseInt(searchParams.get('days') || '30')
    
    // 生成模拟历史数据
    const history = []
    const baseTvl = Math.random() * 1000000000 + 500000000
    const now = Date.now()
    
    for (let i = days; i >= 0; i--) {
      const date = now - (i * 24 * 60 * 60 * 1000)
      const volatility = 0.1 // 10%的波动
      const randomChange = (Math.random() - 0.5) * volatility
      const tvl = baseTvl * (1 + randomChange)
      
      history.push({
        date,
        tvl: Math.max(tvl, 100000000) // 最小1亿
      })
    }
    
    const mockHistoryData = {
      chain: symbol,
      history,
      isMock: true
    }
    
    return NextResponse.json(mockHistoryData)
  } catch (error) {
    console.error('❌ 获取TVL历史数据失败:', error)
    return NextResponse.json(
      { error: '获取TVL历史数据失败' },
      { status: 500 }
    )
  }
} 