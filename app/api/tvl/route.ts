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

// 获取Solana生态的TVL数据
async function getDefiLlamaTVL() {
  // 块外声明，避免严格模式报错
  function findClosest(history: any[], target: number) {
    return history.reduce((prev, curr) =>
      Math.abs(curr.date - target) < Math.abs(prev.date - target) ? curr : prev
    );
  }
  try {
    console.log('开始获取DefiLlama数据...')
    
    // 获取所有链的数据
    const chainsResponse = await fetchWithRetry(
      'https://api.llama.fi/v2/chains'
    )
    
    const chains = chainsResponse.data
    console.log(`获取到 ${chains.length} 条链数据`)
    
    // 查找Solana链的数据
    const solanaChain = chains.find((chain: any) => 
      chain.name.toLowerCase().includes('solana') || 
      chain.gecko_id === 'solana' ||
      chain.chainId === 'solana'
    )
    
    if (!solanaChain) {
      console.log('未找到Solana链数据，可用链:', chains.map((c: any) => c.name).slice(0, 10))
      throw new Error('未找到Solana链的TVL数据')
    }
    
    console.log('找到Solana链数据:', solanaChain)
    console.log('Solana链详细字段:')
    console.log('- tvl:', solanaChain.tvl)
    console.log('- change_1d:', solanaChain.change_1d)
    console.log('- change_7d:', solanaChain.change_7d)
    console.log('- change_30d:', solanaChain.change_30d)
    console.log('- tvl_change_1d:', solanaChain.tvl_change_1d)
    console.log('- tvl_change_7d:', solanaChain.tvl_change_7d)
    console.log('- tvl_change_30d:', solanaChain.tvl_change_30d)
    
    // 尝试获取Solana链的历史数据来计算变化
    let tvl_change_1d = 0, tvl_change_7d = 0, tvl_change_30d = 0
    
    try {
      // 获取Solana链的历史数据
      const historyResponse = await fetchWithRetry(
        `https://api.llama.fi/v2/historicalChainTvl/solana`
      )
      
      const history = historyResponse.data
      console.log('获取到Solana历史数据，数据点数量:', history.length)

      if (history.length > 0) {
        const currentTvl = solanaChain.tvl || 0
        const now = Date.now() / 1000
        
        // 计算24小时变化
        const oneDayAgo = now - 24 * 60 * 60
        const oneDayAgoData = findClosest(history, oneDayAgo)
        if (oneDayAgoData && currentTvl > 0 && oneDayAgoData.tvl > 0) {
          tvl_change_1d = ((currentTvl - oneDayAgoData.tvl) / oneDayAgoData.tvl) * 100
        }
        
        // 计算7天变化
        const sevenDaysAgo = now - 7 * 24 * 60 * 60
        const sevenDaysAgoData = findClosest(history, sevenDaysAgo)
        if (sevenDaysAgoData && currentTvl > 0 && sevenDaysAgoData.tvl > 0) {
          tvl_change_7d = ((currentTvl - sevenDaysAgoData.tvl) / sevenDaysAgoData.tvl) * 100
        }
        
        // 计算30天变化
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60
        const thirtyDaysAgoData = findClosest(history, thirtyDaysAgo)
        if (thirtyDaysAgoData && currentTvl > 0 && thirtyDaysAgoData.tvl > 0) {
          tvl_change_30d = ((currentTvl - thirtyDaysAgoData.tvl) / thirtyDaysAgoData.tvl) * 100
        }
        
        console.log('计算的变化数据:')
        console.log('- tvl_change_1d:', tvl_change_1d)
        console.log('- tvl_change_7d:', tvl_change_7d)
        console.log('- tvl_change_30d:', tvl_change_30d)
      }
    } catch (historyError) {
      console.warn('获取历史数据失败，使用默认值:', historyError)
      // 如果历史数据获取失败，尝试使用链数据中的字段
      tvl_change_1d = solanaChain.change_1d || solanaChain.tvl_change_1d || solanaChain['1d'] || 0
      tvl_change_7d = solanaChain.change_7d || solanaChain.tvl_change_7d || solanaChain['7d'] || 0
      tvl_change_30d = solanaChain.change_30d || solanaChain.tvl_change_30d || solanaChain['30d'] || 0
    }
    
    return {
      chain: 'Solana',
      tvl: solanaChain.tvl || 0,
      tvl_change_1d: tvl_change_1d,
      tvl_change_7d: tvl_change_7d,
      tvl_change_30d: tvl_change_30d,
      timestamp: new Date().toISOString(),
      source: 'defillama'
    }
  } catch (error) {
    console.error('DefiLlama API请求失败:', error)
    throw error
  }
}

// 获取TVL数据
export async function GET() {
  try {
    console.log('尝试从DefiLlama获取TVL数据...')
    const tvlData = await getDefiLlamaTVL()
    console.log('成功从DefiLlama获取TVL数据:', {
      tvl: tvlData.tvl,
      tvl_change_1d: tvlData.tvl_change_1d,
      tvl_change_7d: tvlData.tvl_change_7d,
      tvl_change_30d: tvlData.tvl_change_30d
    })
    
    // 尝试保存TVL数据到数据库
    try {
      const supabaseAdmin = getSupabaseAdmin()
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('tvl_data')
          .insert({
            chain: 'Solana',
            tvl: tvlData.tvl,
            tvl_change_1d: tvlData.tvl_change_1d,
            tvl_change_7d: tvlData.tvl_change_7d,
            tvl_change_30d: tvlData.tvl_change_30d,
            protocols_count: 0
          })
        
        console.log('TVL数据已保存到数据库')
      }
    } catch (dbError) {
      console.warn('保存TVL数据到数据库失败:', dbError)
      // 不影响API返回，继续返回TVL数据
    }
    
    return NextResponse.json(tvlData)
  } catch (error) {
    console.error('获取TVL数据失败:', error)
    
    // 返回模拟数据而不是错误
    return NextResponse.json({
      chain: 'Solana',
      tvl: 1500000000, // 15亿美元
      tvl_change_1d: 2.5,
      tvl_change_7d: 8.3,
      tvl_change_30d: 15.7,
      timestamp: new Date().toISOString(),
      source: 'mock',
      isMock: true
    })
  }
} 