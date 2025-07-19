import { NextResponse } from 'next/server'
import axios from 'axios'
import { query } from '@/lib/database'

// 带重试的请求函数
async function fetchWithRetry(url: string, maxRetries = 3, headers?: any) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const defaultHeaders = {
        'User-Agent': 'SOLBTC-DCA-System/1.0'
      }
      
      const finalHeaders = { ...defaultHeaders, ...headers }
      
      const response = await axios.get(url, {
        timeout: 10000, // 10秒超时
        headers: finalHeaders
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

// 从币安获取SOL价格数据
async function getBinancePrice() {
  try {
    // 获取SOL/USDT价格
    const solUsdtResponse = await fetchWithRetry(
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT'
    )
    
    // 获取SOL/BTC价格
    const solBtcResponse = await fetchWithRetry(
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLBTC'
    )
    
    // 获取24小时统计信息
    const statsResponse = await fetchWithRetry(
      'https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT'
    )
    
    const solUsdtPrice = parseFloat(solUsdtResponse.data.price)
    const solBtcPrice = parseFloat(solBtcResponse.data.price)
    const stats = statsResponse.data
    
    return {
      symbol: 'SOL',
      price: solUsdtPrice,
      price_btc: solBtcPrice,
      volume_24h: parseFloat(stats.volume) * solUsdtPrice, // 转换为USD
      market_cap: solUsdtPrice * 400000000, // 估算市值
      timestamp: new Date().toISOString(),
      source: 'binance'
    }
  } catch (error) {
    console.error('币安API请求失败:', error)
    throw error
  }
}

// 从CoinGecko获取SOL价格数据（备用）
async function getCoinGeckoPrice() {
  try {
    const headers: any = {}
    
    // 如果有API Key，添加到请求头
    if (process.env.COINGECKO_API_KEY) {
      headers['X-CG-API-KEY'] = process.env.COINGECKO_API_KEY
    }
    
    const response = await fetchWithRetry(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,btc&include_24hr_vol=true&include_market_cap=true',
      3,
      headers
    )
    
    const solData = response.data.solana
    
    return {
      symbol: 'SOL',
      price: solData.usd,
      price_btc: solData.btc,
      volume_24h: solData.usd_24h_vol,
      market_cap: solData.usd_market_cap,
      timestamp: new Date().toISOString(),
      source: 'coingecko'
    }
  } catch (error) {
    console.error('CoinGecko API请求失败:', error)
    throw error
  }
}

// 获取SOL价格数据
export async function GET() {
  try {
    let priceData
    
    // 优先使用币安API
    try {
      console.log('尝试从币安获取价格数据...')
      priceData = await getBinancePrice()
      console.log('成功从币安获取价格数据')
    } catch (binanceError) {
      console.warn('币安API失败，尝试CoinGecko...')
      try {
        priceData = await getCoinGeckoPrice()
        console.log('成功从CoinGecko获取价格数据')
      } catch (coingeckoError) {
        console.error('所有API都失败了，返回模拟数据')
        throw new Error('所有价格API都失败了')
      }
    }
    
    // 尝试保存价格数据到数据库
    try {
      await query(`
        INSERT INTO price_data (symbol, price, volume_24h, market_cap, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, ['SOL', priceData.price, priceData.volume_24h, priceData.market_cap])
      
      console.log('价格数据已保存到数据库')
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
      source: 'mock',
      isMock: true
    })
  }
} 