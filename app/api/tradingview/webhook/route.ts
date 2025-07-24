import { NextRequest, NextResponse } from 'next/server'
import { TradingViewSignalParser } from '@/lib/tradingview/signal-parser'
import { TradingViewRiskController } from '@/lib/tradingview/risk-controller'
import { TradingViewOrderExecutor } from '@/lib/tradingview/order-executor'
import { query } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    console.log('📡 收到TradingView信号')
    
    const signal = await req.json()
    console.log('📡 信号内容:', signal)
    
    // 验证信号格式
    const signalParser = new TradingViewSignalParser()
    const tradeSignal = signalParser.parseSignal(signal)
    
    console.log('✅ 信号解析成功:', tradeSignal)
    
    // 风险控制检查
    const riskController = new TradingViewRiskController()
    const riskCheck = await riskController.performRiskCheck(tradeSignal)
    
    console.log('🔒 风险检查结果:', riskCheck)
    
    if (!riskCheck.approved) {
      // 记录被拒绝的信号
      await recordSignal(signal, tradeSignal, riskCheck, null, 'REJECTED')
      
      return NextResponse.json({
        success: false,
        error: '风险控制未通过',
        details: riskCheck.reasons,
        recommendations: riskCheck.recommendations
      }, { status: 400 })
    }
    
    // 执行交易
    const orderExecutor = new TradingViewOrderExecutor()
    const executionResult = await orderExecutor.executeTradeSignal(tradeSignal)
    
    console.log('📊 订单执行结果:', executionResult)
    
    // 记录信号和交易结果
    await recordSignal(signal, tradeSignal, riskCheck, executionResult, 
      executionResult.success ? 'EXECUTED' : 'FAILED')
    
    if (executionResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          signal: tradeSignal,
          riskCheck,
          execution: executionResult
        },
        message: '信号处理完成'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '订单执行失败',
        details: executionResult.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ TradingView信号处理错误:', error)
    
    return NextResponse.json({
      success: false,
      error: '信号处理失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

async function recordSignal(
  originalSignal: any,
  tradeSignal: any,
  riskCheck: any,
  executionResult: any,
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'FAILED'
) {
  try {
    await query(`
      INSERT INTO tradingview_signals (
        original_signal,
        trade_signal,
        risk_check,
        execution_result,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      JSON.stringify(originalSignal),
      JSON.stringify(tradeSignal),
      JSON.stringify(riskCheck),
      JSON.stringify(executionResult),
      status
    ])
    
    console.log('✅ 信号记录已保存')
  } catch (error) {
    console.error('❌ 保存信号记录失败:', error)
  }
}

// 获取信号历史
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') || '50'
    const status = searchParams.get('status')
    
    let queryStr = `
      SELECT * FROM tradingview_signals 
      ORDER BY created_at DESC 
      LIMIT $1
    `
    let params: (string | number)[] = [parseInt(limit)]
    
    if (status) {
      queryStr = queryStr.replace('ORDER BY', 'WHERE status = $2 ORDER BY')
      params.push(status)
    }
    
    const result = await query(queryStr, params)
    
    const signals = result.rows.map(row => {
      try {
        return {
          id: row.id,
          originalSignal: typeof row.original_signal === 'string' ? JSON.parse(row.original_signal) : row.original_signal,
          tradeSignal: typeof row.trade_signal === 'string' ? JSON.parse(row.trade_signal) : row.trade_signal,
          riskCheck: typeof row.risk_check === 'string' ? JSON.parse(row.risk_check) : row.risk_check,
          executionResult: row.execution_result ? (typeof row.execution_result === 'string' ? JSON.parse(row.execution_result) : row.execution_result) : null,
          status: row.status,
          createdAt: row.created_at
        }
      } catch (parseError) {
        console.error('解析信号数据失败:', parseError, '原始数据:', row)
        return {
          id: row.id,
          originalSignal: row.original_signal,
          tradeSignal: row.trade_signal,
          riskCheck: row.risk_check,
          executionResult: row.execution_result,
          status: row.status,
          createdAt: row.created_at,
          parseError: true
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: signals,
      message: '信号历史获取成功'
    })
  } catch (error) {
    console.error('获取信号历史失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取信号历史失败'
    }, { status: 500 })
  }
} 