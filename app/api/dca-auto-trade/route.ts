import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'SOLUSDT'
    
    // 生成模拟DCA设置数据
    const mockDcaSettings = {
      symbol: symbol,
      is_active: true,
      amount: '30.00000000',
      max_orders: 6,
      price_deviation: '2.00',
      take_profit: '1.50',
      stop_loss: '6.00',
      current_order: 1,
      total_invested: '29.86000000',
      last_check: new Date().toISOString(),
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      hasDcaSettings: true,
      dcaSettings: mockDcaSettings
    })
  } catch (error) {
    console.error('❌ 获取DCA设置失败:', error)
    return NextResponse.json(
      { success: false, error: '获取DCA设置失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const dcaData = await req.json()
    
    // 模拟保存DCA设置
    const savedSettings = {
      ...dcaData,
      id: Math.floor(Math.random() * 1000) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: savedSettings,
      message: 'DCA设置保存成功'
    })
  } catch (error) {
    console.error('❌ 保存DCA设置失败:', error)
    return NextResponse.json(
      { success: false, error: '保存DCA设置失败' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { action, ...data } = await req.json()
    
    switch (action) {
      case 'start':
        return NextResponse.json({
          success: true,
          message: 'DCA自动交易已启动'
        })
      case 'stop':
        return NextResponse.json({
          success: true,
          message: 'DCA自动交易已停止'
        })
      case 'pause':
        return NextResponse.json({
          success: true,
          message: 'DCA自动交易已暂停'
        })
      case 'resume':
        return NextResponse.json({
          success: true,
          message: 'DCA自动交易已恢复'
        })
      default:
        return NextResponse.json(
          { success: false, error: '无效的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ DCA操作失败:', error)
    return NextResponse.json(
      { success: false, error: 'DCA操作失败' },
      { status: 500 }
    )
  }
} 