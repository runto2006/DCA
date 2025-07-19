import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import axios from 'axios'

// 初始化历史价格数据
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase 配置缺失' }, { status: 500 })
    }
    
    // 清空现有数据，强制重新获取
    console.log('清空现有价格数据...')
    await supabaseAdmin
      .from('price_data')
      .delete()
      .neq('id', 0) // 删除所有数据
    
    // 获取SOL历史价格数据（最近200天，确保有足够数据计算技术指标）
    console.log('获取SOL历史价格数据...')
    
    const headers: any = {
      'User-Agent': 'SOLBTC-DCA-System/1.0'
    }
    
    // 如果有API Key，添加到请求头
    if (process.env.COINGECKO_API_KEY) {
      headers['X-CG-API-KEY'] = process.env.COINGECKO_API_KEY
    }
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=200&interval=daily',
      { headers }
    )
    
    const prices = response.data.prices
    const volumes = response.data.total_volumes
    
    console.log(`获取到 ${prices.length} 条价格数据`)
    
    // 批量插入历史价格数据
    const priceDataToInsert = prices.map((price: [number, number], index: number) => {
      const volume = volumes[index]?.[1] || 0
      return {
        symbol: 'SOL',
        price: price[1],
        volume_24h: volume,
        market_cap: price[1] * 400000000, // 估算市值
        timestamp: new Date(price[0]).toISOString()
      }
    })
    
    // 分批插入数据（避免单次插入过多）
    const batchSize = 20
    for (let i = 0; i < priceDataToInsert.length; i += batchSize) {
      const batch = priceDataToInsert.slice(i, i + batchSize)
      const { error } = await supabaseAdmin
        .from('price_data')
        .insert(batch)
      
      if (error) {
        console.error(`插入第 ${i + 1} 批数据失败:`, error)
      }
    }
    
    console.log(`成功插入 ${priceDataToInsert.length} 条历史价格数据`)
    
    return NextResponse.json({
      message: '历史价格数据初始化完成',
      count: priceDataToInsert.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('数据初始化失败:', error)
    return NextResponse.json(
      { error: '数据初始化失败' },
      { status: 500 }
    )
  }
} 