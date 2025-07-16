import { NextResponse } from 'next/server'
import axios from 'axios'
import { getSupabaseAdmin } from '@/lib/supabase'

// 带重试的请求函数
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000, // 10秒超时
        headers: {
          'User-Agent': 'SOLBTC-DCA-System/1.0'
        }
      })
      return response
    } catch (error: any) {
      console.warn(`第 ${i + 1} 次请求失败:`, error.message)
      if (i === maxRetries - 1) throw error
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  throw new Error('所有重试都失败了')
}

// 获取SOL价格数据
export async function GET() {
  try {
    // 从CoinGecko API获取SOL价格数据
    const response = await fetchWithRetry(
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
    
    // 尝试保存价格数据到数据库
    try {
      const supabaseAdmin = getSupabaseAdmin()
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('price_data')
          .insert({
            symbol: 'SOL',
            price: solData.usd,
            volume_24h: solData.usd_24h_vol,
            market_cap: solData.usd_market_cap
          })
        
        console.log('价格数据已保存到数据库')
      }
    } catch (dbError) {
      console.warn('保存价格数据到数据库失败:', dbError)
      // 不影响API返回，继续返回价格数据
    }
    
    return NextResponse.json(priceData)
  } catch (error) {
    console.error('获取价格数据失败:', error)
    
    // 返回模拟数据而不是错误
    return NextResponse.json({
      symbol: 'SOL',
      price: 98.45,
      price_btc: 0.00234,
      volume_24h: 2500000000,
      market_cap: 45000000000,
      timestamp: new Date().toISOString(),
      isMock: true
    })
  }
} 