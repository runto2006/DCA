import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { exitPrice } = await req.json()
    const positionId = params.id
    
    // 模拟关闭持仓
    const closedPosition = {
      id: parseInt(positionId),
      exit_price: exitPrice,
      exit_date: new Date().toISOString(),
      status: 'CLOSED',
      pnl: Math.random() * 200 - 100, // 模拟盈亏
      pnl_percentage: Math.random() * 20 - 10
    }
    
    return NextResponse.json({
      success: true,
      data: closedPosition,
      message: '持仓关闭成功'
    })
  } catch (error) {
    console.error('❌ 关闭持仓失败:', error)
    return NextResponse.json(
      { success: false, error: '关闭持仓失败' },
      { status: 500 }
    )
  }
} 