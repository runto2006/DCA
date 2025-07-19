import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 移动止盈检查定时任务
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 获取所有启用移动止盈的活跃持仓
    const { data: positions, error: positionsError } = await supabaseAdmin
      .from('user_positions')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('trailing_stop_enabled', true)

    if (positionsError) {
      console.error('获取持仓失败:', positionsError)
      return NextResponse.json(
        { error: '获取持仓失败' },
        { status: 500 }
      )
    }

    if (!positions || positions.length === 0) {
      return NextResponse.json({
        message: '没有启用移动止盈的持仓',
        checkedPositions: 0,
        triggeredPositions: 0
      })
    }

    // 获取当前价格
    const { data: priceData, error: priceError } = await supabaseAdmin
      .from('price_data')
      .select('price')
      .eq('symbol', 'SOL')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (priceError || !priceData) {
      console.error('获取当前价格失败:', priceError)
      return NextResponse.json(
        { error: '获取当前价格失败' },
        { status: 500 }
      )
    }

    const currentPrice = priceData.price
    let triggeredPositions = 0
    const results = []

    // 检查每个持仓
    for (const position of positions) {
      let shouldClose = false
      let newTrailingStopPrice = position.trailing_stop_price
      let newHighestPrice = position.highest_price || position.entry_price
      let newLowestPrice = position.lowest_price || position.entry_price

      if (position.position_type === 'LONG') {
        // 做多持仓：价格下跌到移动止盈价格时平仓
        if (currentPrice <= position.trailing_stop_price) {
          shouldClose = true
        } else if (currentPrice > position.highest_price) {
          // 更新最高价格和移动止盈价格
          newHighestPrice = currentPrice
          newTrailingStopPrice = currentPrice * (1 - position.trailing_stop_distance / 100)
        }
      } else {
        // 做空持仓：价格上涨到移动止盈价格时平仓
        if (currentPrice >= position.trailing_stop_price) {
          shouldClose = true
        } else if (currentPrice < position.lowest_price) {
          // 更新最低价格和移动止盈价格
          newLowestPrice = currentPrice
          newTrailingStopPrice = currentPrice * (1 + position.trailing_stop_distance / 100)
        }
      }

      if (shouldClose) {
        // 触发平仓
        const pnl = position.position_type === 'LONG' 
          ? (currentPrice - position.entry_price) * position.quantity
          : (position.entry_price - currentPrice) * position.quantity
        
        const pnl_percentage = position.position_type === 'LONG'
          ? ((currentPrice - position.entry_price) / position.entry_price) * 100
          : ((position.entry_price - currentPrice) / position.entry_price) * 100

        const { error: closeError } = await supabaseAdmin
          .from('user_positions')
          .update({
            exit_price: currentPrice,
            exit_date: new Date().toISOString(),
            status: 'CLOSED',
            pnl,
            pnl_percentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', position.id)

        if (closeError) {
          console.error(`平仓持仓 ${position.id} 失败:`, closeError)
          results.push({
            positionId: position.id,
            action: 'close',
            success: false,
            error: closeError.message
          })
        } else {
          triggeredPositions++
          results.push({
            positionId: position.id,
            action: 'close',
            success: true,
            exitPrice: currentPrice,
            pnl
          })

          // 记录交易历史
          try {
            await supabaseAdmin
              .from('trade_history')
              .insert({
                symbol: position.symbol,
                trade_type: position.position_type === 'LONG' ? 'SELL' : 'BUY',
                price: currentPrice,
                quantity: position.quantity,
                total_amount: currentPrice * position.quantity,
                strategy_reason: '移动止盈触发',
                notes: `移动止盈触发，距离: ${position.trailing_stop_distance}%`,
                user_id: position.user_id
              })
          } catch (tradeError) {
            console.warn('记录交易历史失败:', tradeError)
          }
        }
      } else if (newTrailingStopPrice !== position.trailing_stop_price) {
        // 更新移动止盈价格
        const { error: updateError } = await supabaseAdmin
          .from('user_positions')
          .update({
            trailing_stop_price: newTrailingStopPrice,
            highest_price: newHighestPrice,
            lowest_price: newLowestPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', position.id)

        if (updateError) {
          console.error(`更新持仓 ${position.id} 移动止盈价格失败:`, updateError)
          results.push({
            positionId: position.id,
            action: 'update',
            success: false,
            error: updateError.message
          })
        } else {
          results.push({
            positionId: position.id,
            action: 'update',
            success: true,
            newTrailingStopPrice,
            newHighestPrice,
            newLowestPrice
          })
        }
      } else {
        results.push({
          positionId: position.id,
          action: 'check',
          success: true,
          message: '无需操作'
        })
      }
    }

    return NextResponse.json({
      message: '移动止盈检查完成',
      currentPrice,
      checkedPositions: positions.length,
      triggeredPositions,
      results
    })
  } catch (error) {
    console.error('移动止盈检查失败:', error)
    return NextResponse.json(
      { error: '移动止盈检查失败' },
      { status: 500 }
    )
  }
} 