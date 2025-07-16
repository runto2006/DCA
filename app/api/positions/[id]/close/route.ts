import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 平仓API
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { exit_price } = body

    if (!exit_price) {
      return NextResponse.json(
        { error: '缺少出场价格' },
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
        { error: '持仓已平仓' },
        { status: 400 }
      )
    }

    // 计算盈亏
    let pnl = 0
    let pnl_percentage = 0

    if (position.position_type === 'LONG') {
      pnl = (exit_price - position.entry_price) * position.quantity
      pnl_percentage = ((exit_price - position.entry_price) / position.entry_price) * 100
    } else {
      pnl = (position.entry_price - exit_price) * position.quantity
      pnl_percentage = ((position.entry_price - exit_price) / position.entry_price) * 100
    }

    // 更新持仓状态
    const { error: updateError } = await supabaseAdmin
      .from('user_positions')
      .update({
        exit_price,
        exit_date: new Date().toISOString(),
        status: 'CLOSED',
        pnl,
        pnl_percentage
      })
      .eq('id', id)

    if (updateError) {
      console.error('更新持仓失败:', updateError)
      return NextResponse.json(
        { error: '平仓失败' },
        { status: 500 }
      )
    }

    // 记录交易历史
    try {
      await supabaseAdmin
        .from('trade_history')
        .insert({
          symbol: position.symbol,
          trade_type: position.position_type === 'LONG' ? 'SELL' : 'BUY',
          price: exit_price,
          quantity: position.quantity,
          total_amount: exit_price * position.quantity,
          strategy_reason: '手动平仓',
          user_id: position.user_id
        })
    } catch (tradeError) {
      console.warn('记录交易历史失败:', tradeError)
    }

    return NextResponse.json({
      message: '平仓成功',
      pnl,
      pnl_percentage: pnl_percentage.toFixed(2)
    })

  } catch (error) {
    console.error('平仓失败:', error)
    return NextResponse.json(
      { error: '平仓失败' },
      { status: 500 }
    )
  }
} 