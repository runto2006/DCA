import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 获取交易历史
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('trade_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: '获取交易历史失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('获取交易历史失败:', error)
    return NextResponse.json(
      { error: '获取交易历史失败' },
      { status: 500 }
    )
  }
} 