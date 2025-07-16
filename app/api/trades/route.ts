import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 获取交易历史
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      console.warn('Supabase configuration missing, returning empty array')
      return NextResponse.json([])
    }

    const { data, error } = await supabaseAdmin
      .from('trade_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      console.error('获取交易历史失败:', error)
      return NextResponse.json([])
    }

    // 确保返回数组格式
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (error) {
    console.error('获取交易历史失败:', error)
    return NextResponse.json([])
  }
} 