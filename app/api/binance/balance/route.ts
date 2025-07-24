import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'SOL'
    
    // 生成模拟币安账户数据
    const mockAccountData = {
      timestamp: new Date().toISOString(),
      account: {
        canTrade: true,
        canWithdraw: true,
        canDeposit: true,
        updateTime: Date.now()
      },
      balances: {
        'USDT': {
          asset: 'USDT',
          free: 5000.00,
          locked: 0.00,
          total: 5000.00,
          price: 1.00,
          value: 5000.00
        },
        [symbol]: {
          asset: symbol,
          free: 50.00,
          locked: 0.00,
          total: 50.00,
          price: 100.00,
          value: 5000.00
        },
        'BTC': {
          asset: 'BTC',
          free: 0.1,
          locked: 0.00,
          total: 0.1,
          price: 50000.00,
          value: 5000.00
        }
      },
      totalValue: 15000.00
    }
    
    return NextResponse.json({
      success: true,
      data: mockAccountData
    })
  } catch (error) {
    console.error('❌ 获取币安余额失败:', error)
    return NextResponse.json(
      { success: false, error: '获取币安余额失败' },
      { status: 500 }
    )
  }
} 