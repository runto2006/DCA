import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'SOL'
    
    // 生成模拟持仓数据
    const mockPositions = [
      {
        id: 1,
        symbol: symbol,
        position_type: 'LONG',
        entry_price: 95.50,
        quantity: 10.5,
        total_amount: 1002.75,
        stop_loss: 85.00,
        take_profit: 110.00,
        strategy_reason: '技术分析突破',
        notes: '突破关键阻力位',
        entry_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        pnl: 52.50,
        pnl_percentage: 5.24,
        trailing_stop_enabled: false,
        trailing_stop_distance: null,
        trailing_stop_price: null,
        highest_price: 102.00,
        lowest_price: 94.00
      },
      {
        id: 2,
        symbol: symbol,
        position_type: 'SHORT',
        entry_price: 105.00,
        quantity: 5.0,
        total_amount: 525.00,
        stop_loss: 115.00,
        take_profit: 95.00,
        strategy_reason: '超买回调',
        notes: 'RSI超买信号',
        entry_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        pnl: -25.00,
        pnl_percentage: -4.76,
        trailing_stop_enabled: true,
        trailing_stop_distance: 3.0,
        trailing_stop_price: 108.00,
        highest_price: 108.00,
        lowest_price: 100.00
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: mockPositions
    })
  } catch (error) {
    console.error('❌ 获取持仓数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取持仓数据失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const positionData = await req.json()
    
    // 模拟创建新持仓
    const newPosition = {
      id: Math.floor(Math.random() * 1000) + 1,
      ...positionData,
      entry_date: new Date().toISOString(),
      status: 'ACTIVE',
      pnl: 0,
      pnl_percentage: 0
    }
    
    return NextResponse.json({
      success: true,
      data: newPosition,
      message: '持仓创建成功'
    })
  } catch (error) {
    console.error('❌ 创建持仓失败:', error)
    return NextResponse.json(
      { success: false, error: '创建持仓失败' },
      { status: 500 }
    )
  }
} 