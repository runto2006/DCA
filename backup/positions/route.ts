import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// 获取持仓列表和统计信息
export async function GET() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.warn('Supabase configuration missing, returning empty array')
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('user_positions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取持仓数据失败:', error)
      return NextResponse.json([])
    }

    const positions = Array.isArray(data) ? data : []

    // 计算持仓统计信息
    const stats = calculatePositionStats(positions)

    return NextResponse.json({
      positions,
      stats
    })
  } catch (error) {
    console.error('获取持仓数据失败:', error)
    return NextResponse.json([])
  }
}

// 计算持仓统计信息
function calculatePositionStats(positions: any[]) {
  const activePositions = positions.filter(p => p.status === 'ACTIVE')
  const closedPositions = positions.filter(p => p.status === 'CLOSED')
  
  // 总持仓价值
  const totalValue = activePositions.reduce((sum, pos) => {
    return sum + (pos.entry_price * pos.quantity)
  }, 0)
  
  // 总浮盈浮亏
  const totalUnrealizedPnL = activePositions.reduce((sum, pos) => {
    return sum + (pos.pnl || 0)
  }, 0)
  
  // 总已实现盈亏
  const totalRealizedPnL = closedPositions.reduce((sum, pos) => {
    return sum + (pos.pnl || 0)
  }, 0)
  
  // 胜率
  const winningTrades = closedPositions.filter(pos => (pos.pnl || 0) > 0).length
  const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0
  
  // 平均持仓时间
  const avgHoldingTime = closedPositions.length > 0 ? 
    closedPositions.reduce((sum, pos) => {
      const entry = new Date(pos.created_at)
      const exit = new Date(pos.updated_at)
      return sum + (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24) // 转换为天
    }, 0) / closedPositions.length : 0
  
  // 最大单笔盈利和亏损
  const maxProfit = Math.max(...closedPositions.map(pos => pos.pnl || 0), 0)
  const maxLoss = Math.min(...closedPositions.map(pos => pos.pnl || 0), 0)
  
  // 风险指标
  const totalTrades = closedPositions.length
  const profitableTrades = closedPositions.filter(pos => (pos.pnl || 0) > 0)
  const lossTrades = closedPositions.filter(pos => (pos.pnl || 0) < 0)
  
  const avgProfit = profitableTrades.length > 0 ? 
    profitableTrades.reduce((sum, pos) => sum + (pos.pnl || 0), 0) / profitableTrades.length : 0
  const avgLoss = lossTrades.length > 0 ? 
    lossTrades.reduce((sum, pos) => sum + (pos.pnl || 0), 0) / lossTrades.length : 0
  
  const profitFactor = avgLoss !== 0 ? Math.abs(avgProfit / avgLoss) : 0
  
  return {
    totalPositions: positions.length,
    activePositions: activePositions.length,
    closedPositions: closedPositions.length,
    totalValue: Math.round(totalValue * 100) / 100,
    totalUnrealizedPnL: Math.round(totalUnrealizedPnL * 100) / 100,
    totalRealizedPnL: Math.round(totalRealizedPnL * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    avgHoldingTime: Math.round(avgHoldingTime * 100) / 100,
    maxProfit: Math.round(maxProfit * 100) / 100,
    maxLoss: Math.round(maxLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalTrades,
    profitableTrades: profitableTrades.length,
    lossTrades: lossTrades.length
  }
}

// 创建新持仓
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      symbol, 
      position_type, 
      entry_price, 
      quantity
      // 暂时移除所有可能缺失的字段
    } = body

    // 验证必填字段
    if (!symbol || !position_type || !entry_price || !quantity) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证价格和数量
    if (entry_price <= 0 || quantity <= 0) {
      return NextResponse.json(
        { error: '价格和数量必须大于0' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 只使用基本字段创建持仓
    const { data, error } = await supabase
      .from('user_positions')
      .insert({
        symbol,
        position_type,
        entry_price,
        quantity,
        total_amount: entry_price * quantity,
        user_id: 'default_user',
        status: 'ACTIVE'
      })
      .select()
      .single()

    if (error) {
      console.error('创建持仓失败:', error)
      return NextResponse.json(
        { error: '创建持仓失败', details: error.message },
        { status: 500 }
      )
    }

    // 记录交易历史（如果trade_history表存在）
    try {
      await supabase
        .from('trade_history')
        .insert({
          symbol,
          trade_type: position_type === 'LONG' ? 'BUY' : 'SELL',
          price: entry_price,
          quantity,
          total_amount: entry_price * quantity,
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