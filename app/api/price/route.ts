import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'BTC'
    
    // 生成模拟价格数据
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
    const volatility = 0.05 // 5%的波动
    const randomChange = (Math.random() - 0.5) * volatility
    const price = basePrice * (1 + randomChange)
    
    const mockPriceData = {
      symbol,
      price: parseFloat(price.toFixed(2)),
      price_btc: symbol === 'BTC' ? 1 : price / basePrices['BTC'],
      volume_24h: Math.random() * 1000000000 + 100000000, // 1-11亿
      market_cap: price * (Math.random() * 1000000000 + 100000000), // 市值
      timestamp: new Date().toISOString(),
      isMock: true
    }
    
    return NextResponse.json(mockPriceData)
  } catch (error) {
    console.error('❌ 获取价格数据失败:', error)
    return NextResponse.json(
      { error: '获取价格数据失败' },
      { status: 500 }
    )
  }
} 