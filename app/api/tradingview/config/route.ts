import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

// 获取TradingView配置
export async function GET(req: NextRequest) {
  try {
    const result = await query(`
      SELECT config_data FROM tradingview_config 
      WHERE id = 1
    `)
    
    if (result.rows.length === 0) {
      // 返回默认配置
      const defaultConfig = {
        enabled: false,
        webhookUrl: '',
        secretKey: '',
        defaultExchange: 'binance',
        exchangePriority: ['binance', 'okx', 'bitget', 'gate'],
        maxDailyLoss: 1000,
        maxPositionSize: 0.1,
        minConfidence: 70,
        maxLeverage: 5,
        allowedStrategies: [],
        blockedSymbols: [],
        tradingHours: {
          enabled: false,
          start: '09:00',
          end: '17:00',
          timezone: 'Asia/Shanghai'
        },
        notifications: {
          email: false,
          telegram: false,
          webhook: false
        }
      }
      
      return NextResponse.json({
        success: true,
        data: defaultConfig
      })
    }
    
    const config = JSON.parse(result.rows[0].config_data)
    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('❌ 获取TradingView配置失败:', error)
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    )
  }
}

// 保存TradingView配置
export async function POST(req: NextRequest) {
  try {
    const config = await req.json()
    
    await query(`
      INSERT INTO tradingview_config (id, config_data, updated_at) 
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET
        config_data = EXCLUDED.config_data,
        updated_at = NOW()
    `, [JSON.stringify(config)])
    
    return NextResponse.json({
      success: true,
      message: '配置保存成功'
    })
  } catch (error) {
    console.error('❌ 保存TradingView配置失败:', error)
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    )
  }
} 