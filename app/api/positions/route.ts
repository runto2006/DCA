import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 获取持仓列表
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      console.warn('Supabase configuration missing, returning empty array')
      return NextResponse.json([])
    }

    const { data, error } = await supabaseAdmin
      .from('user_positions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取持仓数据失败:', error)
      return NextResponse.json([])
    }

    // 确保返回数组格式
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (error) {
    console.error('获取持仓数据失败:', error)
    return NextResponse.json([])
  }
}

// 创建新持仓
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { symbol, position_type, entry_price, quantity } = body

    // 验证必填字段
    if (!symbol || !position_type || !entry_price || !quantity) {
      return NextResponse.json(
        { error: '缺少必填字段' },
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

    const { data, error } = await supabaseAdmin
      .from('user_positions')
      .insert({
        symbol,
        position_type,
        entry_price,
        quantity,
        user_id: 'default_user'
      })
      .select()
      .single()

    if (error) {
      console.error('创建持仓失败:', error)
      return NextResponse.json(
        { error: '创建持仓失败' },
        { status: 500 }
      )
    }

    // 记录交易历史
    try {
      await supabaseAdmin
        .from('trade_history')
        .insert({
          symbol,
          trade_type: position_type === 'LONG' ? 'BUY' : 'SELL',
          price: entry_price,
          quantity,
          total_amount: entry_price * quantity,
          strategy_reason: '手动创建持仓',
          user_id: 'default_user'
        })
    } catch (tradeError) {
      console.warn('记录交易历史失败:', tradeError)
      // 不影响持仓创建，继续返回成功
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('创建持仓失败:', error)
    return NextResponse.json(
      { error: '创建持仓失败' },
      { status: 500 }
    )
  }
} 