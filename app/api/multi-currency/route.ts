import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'prices'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (action === 'prices') {
      // 返回价格数据
      const currencies = [
        { symbol: 'BTC', name: 'Bitcoin', full_name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum', full_name: 'Ethereum' },
        { symbol: 'SOL', name: 'Solana', full_name: 'Solana' },
        { symbol: 'BNB', name: 'BNB', full_name: 'Binance Coin' },
        { symbol: 'ADA', name: 'Cardano', full_name: 'Cardano' },
        { symbol: 'DOT', name: 'Polkadot', full_name: 'Polkadot' },
        { symbol: 'LINK', name: 'Chainlink', full_name: 'Chainlink' },
        { symbol: 'UNI', name: 'Uniswap', full_name: 'Uniswap' },
        { symbol: 'LTC', name: 'Litecoin', full_name: 'Litecoin' },
        { symbol: 'BCH', name: 'Bitcoin Cash', full_name: 'Bitcoin Cash' }
      ].slice(0, limit)
      
      const mockData = currencies.map(currency => {
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
        
        const basePrice = basePrices[currency.symbol] || 100
        const volatility = 0.05
        const randomChange = (Math.random() - 0.5) * volatility
        const price = basePrice * (1 + randomChange)
        
        return {
          symbol: currency.symbol,
          name: currency.name,
          price_usdt: parseFloat(price.toFixed(2)),
          price_btc: currency.symbol === 'BTC' ? 1 : price / basePrices['BTC'],
          volume_24h: Math.random() * 1000000000 + 100000000,
          market_cap: price * (Math.random() * 1000000000 + 100000000),
          price_change_24h: (Math.random() - 0.5) * 20,
          price_change_7d: (Math.random() - 0.5) * 30,
          high_24h: price * (1 + Math.random() * 0.1),
          low_24h: price * (1 - Math.random() * 0.1),
          timestamp: new Date().toISOString()
        }
      })
      
      return NextResponse.json({
        success: true,
        data: mockData
      })
    } else if (action === 'scores') {
      // 返回策略评分数据
      const scores = [
        { symbol: 'BTC', total_score: 85, recommendation: 'STRONG_BUY', risk_level: 'LOW' },
        { symbol: 'ETH', total_score: 78, recommendation: 'BUY', risk_level: 'LOW' },
        { symbol: 'SOL', total_score: 72, recommendation: 'BUY', risk_level: 'MEDIUM' },
        { symbol: 'BNB', total_score: 65, recommendation: 'HOLD', risk_level: 'MEDIUM' },
        { symbol: 'ADA', total_score: 58, recommendation: 'HOLD', risk_level: 'HIGH' },
        { symbol: 'DOT', total_score: 62, recommendation: 'HOLD', risk_level: 'MEDIUM' },
        { symbol: 'LINK', total_score: 68, recommendation: 'BUY', risk_level: 'MEDIUM' },
        { symbol: 'UNI', total_score: 55, recommendation: 'HOLD', risk_level: 'HIGH' },
        { symbol: 'LTC', total_score: 48, recommendation: 'SELL', risk_level: 'HIGH' },
        { symbol: 'BCH', total_score: 42, recommendation: 'STRONG_SELL', risk_level: 'HIGH' }
      ].slice(0, limit)
      
      return NextResponse.json({
        success: true,
        data: scores
      })
    } else {
      return NextResponse.json(
        { success: false, error: '无效的action参数' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('❌ 获取多币种数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    )
  }
} 