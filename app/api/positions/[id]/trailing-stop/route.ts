import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 启用/禁用移动止盈
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { enabled, distance, currentPrice } = body

    if (enabled === undefined) {
      return NextResponse.json(
        { error: '缺少enabled参数' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 获取持仓信息
    const { data: position, error: positionError } = await supabaseAdmin
      .from('user_positions')
      .select('*')
      .eq('id', id)
      .single()

    if (positionError || !position) {
      return NextResponse.json(
        { error: '持仓不存在' },
        { status: 404 }
      )
    }

    if (position.status === 'CLOSED') {
      return NextResponse.json(
        { error: '持仓已平仓，无法设置移动止盈' },
        { status: 400 }
      )
    }

    // 计算移动止盈价格
    let trailingStopPrice = null
    let highestPrice = position.highest_price || position.entry_price
    let lowestPrice = position.lowest_price || position.entry_price

    if (enabled && distance && currentPrice) {
      // 更新最高/最低价格
      if (position.position_type === 'LONG') {
        highestPrice = Math.max(highestPrice, currentPrice)
        // 移动止盈价格 = 最高价格 * (1 - 距离百分比)
        trailingStopPrice = highestPrice * (1 - distance / 100)
      } else {
        lowestPrice = Math.min(lowestPrice, currentPrice)
        // 移动止盈价格 = 最低价格 * (1 + 距离百分比)
        trailingStopPrice = lowestPrice * (1 + distance / 100)
      }
    }

    // 更新持仓
    const updateData: any = {
      trailing_stop_enabled: enabled,
      highest_price: highestPrice,
      lowest_price: lowestPrice,
      updated_at: new Date().toISOString()
    }

    if (enabled) {
      updateData.trailing_stop_distance = distance
      updateData.trailing_stop_price = trailingStopPrice
    } else {
      updateData.trailing_stop_distance = null
      updateData.trailing_stop_price = null
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_positions')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('更新移动止盈失败:', updateError)
      return NextResponse.json(
        { error: '更新移动止盈失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: enabled ? '移动止盈已启用' : '移动止盈已禁用',
      trailingStopPrice
    })
  } catch (error) {
    console.error('移动止盈操作失败:', error)
    return NextResponse.json(
      { error: '移动止盈操作失败' },
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