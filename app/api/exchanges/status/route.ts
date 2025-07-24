import { NextResponse } from 'next/server'
import { ExchangeManager } from '@/lib/exchanges/exchange-manager'

export async function GET() {
  try {
    const exchangeManager = await ExchangeManager.getInstance()
    
    const configSummary = exchangeManager.getConfigSummary()
    const healthCheck = await exchangeManager.healthCheck()
    
    return NextResponse.json({
      success: true,
      data: {
        configSummary,
        healthCheck
      },
      message: '交易所状态获取成功'
    })
  } catch (error) {
    console.error('获取交易所状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '获取交易所状态失败'
      },
      { status: 500 }
    )
  }
} 