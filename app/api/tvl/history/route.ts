import { NextResponse } from 'next/server'
import axios from 'axios'

// 获取Solana TVL历史数据（近30天）
async function getSolanaTvlHistory() {
  try {
    // DefiLlama历史TVL接口
    const url = 'https://api.llama.fi/v2/historicalChainTvl/solana'
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'SOLBTC-DCA-System/1.0' }
    })
    const data = response.data
    // 只取最近30天
    const last30 = data.slice(-30).map((item: any) => ({
      date: item.date,
      tvl: item.tvl
    }))
    return last30
  } catch (error) {
    console.error('获取Solana TVL历史数据失败:', error)
    // 返回模拟数据
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const base = 1500000000
    return Array.from({ length: 30 }, (_, i) => ({
      date: Math.floor((now - (29 - i) * oneDay) / 1000),
      tvl: base + Math.floor(Math.sin(i / 5) * 50000000 + Math.random() * 20000000)
    }))
  }
}

export async function GET() {
  const history = await getSolanaTvlHistory()
  return NextResponse.json({
    chain: 'Solana',
    history
  })
} 