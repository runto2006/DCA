import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // 可选：指定日期，默认为今天
    const days = parseInt(searchParams.get('days') || '7') // 可选：统计天数，默认7天

    console.log('📊 获取TradingView统计数据:', { date, days })

    // 获取指定日期的统计数据
    if (date) {
      const result = await query(`
        SELECT * FROM tradingview_statistics 
        WHERE date = $1
      `, [date])

      if (result.rows.length === 0) {
        // 如果没有数据，返回空统计
        return NextResponse.json({
          success: true,
          data: {
            date,
            total_signals: 0,
            executed_signals: 0,
            rejected_signals: 0,
            failed_signals: 0,
            total_pnl: 0,
            win_rate: 0,
            avg_confidence: 0
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      })
    }

    // 获取最近N天的统计数据
    const result = await query(`
      SELECT 
        date,
        total_signals,
        executed_signals,
        rejected_signals,
        failed_signals,
        total_pnl,
        win_rate,
        avg_confidence
      FROM tradingview_statistics 
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `)

    // 计算汇总数据
    const summary = {
      total_days: result.rows.length,
      total_signals: 0,
      executed_signals: 0,
      rejected_signals: 0,
      failed_signals: 0,
      total_pnl: 0,
      avg_win_rate: 0,
      avg_confidence: 0
    }

    result.rows.forEach(row => {
      summary.total_signals += row.total_signals || 0
      summary.executed_signals += row.executed_signals || 0
      summary.rejected_signals += row.rejected_signals || 0
      summary.failed_signals += row.failed_signals || 0
      summary.total_pnl += parseFloat(row.total_pnl || 0)
      summary.avg_win_rate += parseFloat(row.win_rate || 0)
      summary.avg_confidence += parseFloat(row.avg_confidence || 0)
    })

    if (result.rows.length > 0) {
      summary.avg_win_rate = summary.avg_win_rate / result.rows.length
      summary.avg_confidence = summary.avg_confidence / result.rows.length
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        daily_data: result.rows
      }
    })

  } catch (error) {
    console.error('❌ 获取TradingView统计数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

// 手动更新统计数据的接口（用于测试或手动同步）
export async function POST(req: NextRequest) {
  try {
    const { date } = await req.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    console.log('🔄 手动更新TradingView统计数据:', targetDate)

    // 计算指定日期的统计数据
    const signalsResult = await query(`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executed_signals,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_signals,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_signals,
        AVG(CAST(trade_signal->>'confidence' AS DECIMAL)) as avg_confidence
      FROM tradingview_signals 
      WHERE DATE(created_at) = $1
    `, [targetDate])

    const row = signalsResult.rows[0]
    const totalSignals = parseInt(row.total_signals || 0)
    const executedSignals = parseInt(row.executed_signals || 0)
    const winRate = totalSignals > 0 ? (executedSignals / totalSignals) * 100 : 0

    // 计算当日PnL（这里需要根据实际交易记录计算）
    const pnlResult = await query(`
      SELECT COALESCE(SUM(CAST(execution_result->>'pnl' AS DECIMAL)), 0) as total_pnl
      FROM tradingview_signals 
      WHERE DATE(created_at) = $1 AND status = 'EXECUTED'
    `, [targetDate])

    const totalPnl = parseFloat(pnlResult.rows[0].total_pnl || 0)

    // 插入或更新统计数据
    await query(`
      INSERT INTO tradingview_statistics (
        date, total_signals, executed_signals, rejected_signals, 
        failed_signals, total_pnl, win_rate, avg_confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (date) DO UPDATE SET
        total_signals = EXCLUDED.total_signals,
        executed_signals = EXCLUDED.executed_signals,
        rejected_signals = EXCLUDED.rejected_signals,
        failed_signals = EXCLUDED.failed_signals,
        total_pnl = EXCLUDED.total_pnl,
        win_rate = EXCLUDED.win_rate,
        avg_confidence = EXCLUDED.avg_confidence,
        updated_at = NOW()
    `, [
      targetDate,
      totalSignals,
      executedSignals,
      parseInt(row.rejected_signals || 0),
      parseInt(row.failed_signals || 0),
      totalPnl,
      winRate,
      parseFloat(row.avg_confidence || 0)
    ])

    console.log('✅ 统计数据更新成功:', {
      date: targetDate,
      total_signals: totalSignals,
      executed_signals: executedSignals,
      win_rate: winRate
    })

    return NextResponse.json({
      success: true,
      message: '统计数据更新成功',
      data: {
        date: targetDate,
        total_signals: totalSignals,
        executed_signals: executedSignals,
        rejected_signals: parseInt(row.rejected_signals || 0),
        failed_signals: parseInt(row.failed_signals || 0),
        total_pnl: totalPnl,
        win_rate: winRate,
        avg_confidence: parseFloat(row.avg_confidence || 0)
      }
    })

  } catch (error) {
    console.error('❌ 更新TradingView统计数据失败:', error)
    return NextResponse.json(
      { success: false, error: '更新统计数据失败' },
      { status: 500 }
    )
  }
} 