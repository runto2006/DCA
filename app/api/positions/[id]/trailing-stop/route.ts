import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { enabled, distance, currentPrice } = await req.json()
    const positionId = params.id
    
    // 模拟设置移动止盈
    const updatedPosition = {
      id: parseInt(positionId),
      trailing_stop_enabled: enabled,
      trailing_stop_distance: distance,
      trailing_stop_price: enabled ? currentPrice * (1 - distance / 100) : null
    }
    
    return NextResponse.json({
      success: true,
      data: updatedPosition,
      message: enabled ? '移动止盈已启用' : '移动止盈已禁用'
    })
  } catch (error) {
    console.error('❌ 设置移动止盈失败:', error)
    return NextResponse.json(
      { success: false, error: '设置移动止盈失败' },
      { status: 500 }
    )
  }
}

// 获取移动止盈状态
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const { data: position, error } = await supabaseAdmin
      .from('user_positions')
      .select('trailing_stop_enabled, trailing_stop_distance, trailing_stop_price, highest_price, lowest_price, entry_price, position_type')
      .eq('id', id)
      .single()
      .execute()

    if (error || !position) {
      return NextResponse.json(
        { error: '持仓不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(position)
  } catch (error) {
    console.error('获取移动止盈状态失败:', error)
    return NextResponse.json(
      { error: '获取移动止盈状态失败' },
      { status: 500 }
    )
  }
} 