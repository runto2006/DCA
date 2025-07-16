import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 平仓操作
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { exit_price } = body
    const positionId = parseInt(params.id)

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 获取持仓信息
    const { data: position, error: fetchError } = await supabaseAdmin
      .from('user_positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (fetchError || !position) {
      return NextResponse.json(
        { error: '持仓不存在' },
        { status: 404 }
      )
    }

    // 更新持仓状态
    const { data, error } = await supabaseAdmin
      .from('user_positions')
      .update({
        exit_price,
        exit_date: new Date().toISOString(),
        status: 'CLOSED'
      })
      .eq('id', positionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '平仓失败' },
        { status: 500 }
      )
    }

    // 记录交易历史
    await supabaseAdmin
      .from('trade_history')
      .insert({
        symbol: position.symbol,
        trade_type: position.position_type === 'LONG' ? 'SELL' : 'BUY',
        price: exit_price,
        quantity: position.quantity,
        total_amount: exit_price * position.quantity,
        strategy_reason: '手动平仓',
        user_id: 'default_user'
      })

    return NextResponse.json(data)
  } catch (error) {
    console.error('平仓失败:', error)
    return NextResponse.json(
      { error: '平仓失败' },
      { status: 500 }
    )
  }
} 