import { NextResponse } from 'next/server'
import axios from 'axios'

// 获取SOL价格数据
export async function GET() {
  try {
    // 从CoinGecko API获取SOL价格数据
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,btc&include_24hr_vol=true&include_market_cap=true'
    )
    
    const solData = response.data.solana
    
    const priceData = {
      symbol: 'SOL',
      price: solData.usd,
      price_btc: solData.btc,
      volume_24h: solData.usd_24h_vol,
      market_cap: solData.usd_market_cap,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(priceData)
  } catch (error) {
    console.error('获取价格数据失败:', error)
    return NextResponse.json(
      { error: '获取价格数据失败' },
      { status: 500 }
    )
  }
} 