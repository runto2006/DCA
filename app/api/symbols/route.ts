import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 硬编码常用交易对
    const commonSymbols = [
      { symbol: 'BTCUSDT', base_asset: 'BTC', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'ETHUSDT', base_asset: 'ETH', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'SOLUSDT', base_asset: 'SOL', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'ADAUSDT', base_asset: 'ADA', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'DOTUSDT', base_asset: 'DOT', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'LINKUSDT', base_asset: 'LINK', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'UNIUSDT', base_asset: 'UNI', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'LTCUSDT', base_asset: 'LTC', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'BCHUSDT', base_asset: 'BCH', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'XRPUSDT', base_asset: 'XRP', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'BNBUSDT', base_asset: 'BNB', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'MATICUSDT', base_asset: 'MATIC', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'AVAXUSDT', base_asset: 'AVAX', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'ATOMUSDT', base_asset: 'ATOM', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'NEARUSDT', base_asset: 'NEAR', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'FTMUSDT', base_asset: 'FTM', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'ALGOUSDT', base_asset: 'ALGO', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'VETUSDT', base_asset: 'VET', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'ICPUSDT', base_asset: 'ICP', quote_asset: 'USDT', category: 'spot', status: 'TRADING' },
      { symbol: 'FILUSDT', base_asset: 'FIL', quote_asset: 'USDT', category: 'spot', status: 'TRADING' }
    ]

    // 过滤分类
    let filteredSymbols = commonSymbols
    if (category !== 'all') {
      filteredSymbols = commonSymbols.filter(s => s.category === category)
    }

    // 分页
    const total = filteredSymbols.length
    const paginatedSymbols = filteredSymbols.slice(offset, offset + limit)

    // 分类统计
    const categories = [
      { category: 'spot', count: commonSymbols.filter(s => s.category === 'spot').length },
      { category: 'futures', count: commonSymbols.filter(s => s.category === 'futures').length }
    ]

    return NextResponse.json({
      success: true,
      data: {
        symbols: paginatedSymbols,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        categories,
        filters: {
          category
        }
      },
      message: '可用币种获取成功'
    })
  } catch (error) {
    console.error('获取可用币种失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取可用币种失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
} 