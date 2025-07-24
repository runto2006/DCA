import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'BTC'
    const timeframe = searchParams.get('timeframe') || '1d'
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // 生成模拟历史价格数据
    const history = []
    const basePrices: { [key: string]: number } = {
      'BTC': 50000,
      'ETH': 3000,
      'SOL': 100,
      'BNB': 400,
      'ADA': 0.5,
      'DOT': 7,
      'LINK': 15,
      'UNI': 8,
      'LTC': 80,
      'BCH': 300
    }
    
    const basePrice = basePrices[symbol] || 100
    const now = Date.now()
    const interval = timeframe === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    
    for (let i = limit; i >= 0; i--) {
      const timestamp = now - (i * interval)
      const volatility = 0.02 // 2%的波动
      const randomChange = (Math.random() - 0.5) * volatility
      const price = basePrice * (1 + randomChange)
      
      history.push({
        timestamp,
        price: parseFloat(price.toFixed(2)),
        volume: Math.random() * 1000000 + 100000
      })
    }
    
    const mockHistoryData = {
      symbol,
      timeframe,
      history,
      isMock: true
    }
    
    return NextResponse.json(mockHistoryData)
  } catch (error) {
    console.error('❌ 获取价格历史数据失败:', error)
    return NextResponse.json(
      { error: '获取价格历史数据失败' },
      { status: 500 }
    )
  }
} 