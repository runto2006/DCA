import { NextResponse } from 'next/server'
import { ArbitrageProtection, DEFAULT_ARBITRAGE_CONFIG } from '@/lib/arbitrage-protection'

// 全局套利保护实例
let arbitrageProtection: ArbitrageProtection | null = null

function getArbitrageProtection(): ArbitrageProtection {
  if (!arbitrageProtection) {
    arbitrageProtection = new ArbitrageProtection(DEFAULT_ARBITRAGE_CONFIG)
  }
  return arbitrageProtection
}

// GET - 获取套利机会
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'SOLUSDT'
    const action = searchParams.get('action')

    const protection = getArbitrageProtection()

    switch (action) {
      case 'opportunities':
        // 检测套利机会
        const opportunities = await protection.detectArbitrageOpportunities(symbol)
        return NextResponse.json({
          success: true,
          data: {
            symbol,
            opportunities,
            timestamp: new Date()
          },
          message: `检测到 ${opportunities.length} 个套利机会`
        })

      case 'status':
        // 获取保护状态
        const status = protection.getStatus()
        const stats = protection.getArbitrageStats()
        const riskCheck = await protection.performRiskCheck()
        
        return NextResponse.json({
          success: true,
          data: {
            status,
            stats,
            riskCheck,
            timestamp: new Date()
          },
          message: '套利保护状态获取成功'
        })

      case 'history':
        // 获取交易历史
        const limit = parseInt(searchParams.get('limit') || '50')
        const history = protection.getTradeHistory(limit)
        
        return NextResponse.json({
          success: true,
          data: {
            history,
            total: history.length
          },
          message: '交易历史获取成功'
        })

      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作',
          message: '请指定有效的操作: opportunities, status, history'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('套利API错误:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      message: '套利操作失败'
    }, { status: 500 })
  }
}

// POST - 执行套利操作
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    const protection = getArbitrageProtection()

    switch (action) {
      case 'execute':
        // 执行套利交易
        const { opportunity, amount } = body
        
        if (!opportunity || !amount) {
          return NextResponse.json({
            success: false,
            error: '缺少必要参数',
            message: '请提供套利机会和交易金额'
          }, { status: 400 })
        }

        const trade = await protection.executeArbitrage(opportunity, amount)
        
        return NextResponse.json({
          success: true,
          data: {
            trade,
            message: '套利交易执行成功'
          },
          message: `套利交易完成，利润: ${trade.profit.toFixed(4)} USDT`
        })

      case 'config':
        // 更新配置
        const { config } = body
        
        if (!config) {
          return NextResponse.json({
            success: false,
            error: '缺少配置参数',
            message: '请提供新的配置'
          }, { status: 400 })
        }

        protection.updateConfig(config)
        
        return NextResponse.json({
          success: true,
          data: {
            message: '配置更新成功'
          },
          message: '套利保护配置已更新'
        })

      case 'enable':
        // 启用/禁用保护
        const { enabled } = body
        
        if (typeof enabled !== 'boolean') {
          return NextResponse.json({
            success: false,
            error: '无效的启用状态',
            message: '请提供有效的启用状态'
          }, { status: 400 })
        }

        protection.setEnabled(enabled)
        
        return NextResponse.json({
          success: true,
          data: {
            enabled,
            message: `套利保护已${enabled ? '启用' : '禁用'}`
          },
          message: `套利保护${enabled ? '启用' : '禁用'}成功`
        })

      case 'emergency-stop':
        // 紧急停止
        await protection.emergencyStop()
        
        return NextResponse.json({
          success: true,
          data: {
            message: '紧急停止执行成功'
          },
          message: '套利系统已紧急停止'
        })

      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作',
          message: '请指定有效的操作: execute, config, enable, emergency-stop'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('套利POST操作错误:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      message: '套利操作失败'
    }, { status: 500 })
  }
} 