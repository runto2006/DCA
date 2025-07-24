import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 模拟交易历史数据
    const mockTrades = [
      {
        id: 1,
        symbol: 'SOLUSDT',
        side: 'BUY',
        price: 203.44,
        quantity: 10.5,
        total: 2136.12,
        fee: 2.14,
        fee_currency: 'USDT',
        exchange: 'binance',
        order_id: 'order_001',
        trade_id: 'trade_001',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        id: 2,
        symbol: 'BTCUSDT',
        side: 'SELL',
        price: 118971.1,
        quantity: 0.1,
        total: 11897.11,
        fee: 11.90,
        fee_currency: 'USDT',
        exchange: 'gate',
        order_id: 'order_002',
        trade_id: 'trade_002',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        id: 3,
        symbol: 'ETHUSDT',
        side: 'BUY',
        price: 3245.67,
        quantity: 2.0,
        total: 6491.34,
        fee: 6.49,
        fee_currency: 'USDT',
        exchange: 'okx',
        order_id: 'order_003',
        trade_id: 'trade_003',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: 4,
        symbol: 'SOLUSDT',
        side: 'SELL',
        price: 202.89,
        quantity: 5.0,
        total: 1014.45,
        fee: 1.01,
        fee_currency: 'USDT',
        exchange: 'binance',
        order_id: 'order_004',
        trade_id: 'trade_004',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: 5,
        symbol: 'ADAUSDT',
        side: 'BUY',
        price: 0.456,
        quantity: 1000,
        total: 456.0,
        fee: 0.46,
        fee_currency: 'USDT',
        exchange: 'gate',
        order_id: 'order_005',
        trade_id: 'trade_005',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      }
    ]

    // 过滤符号
    let filteredTrades = mockTrades
    if (symbol) {
      filteredTrades = mockTrades.filter(t => t.symbol === symbol)
    }

    // 分页
    const total = filteredTrades.length
    const paginatedTrades = filteredTrades.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: {
        trades: paginatedTrades,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      },
      message: '交易历史获取成功'
    })
  } catch (error) {
    console.error('获取交易历史失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取交易历史失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
} 