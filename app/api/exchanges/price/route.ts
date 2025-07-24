import { NextResponse } from 'next/server'
import { ExchangeManager } from '@/lib/exchanges/exchange-manager'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'BTCUSDT'
    const type = searchParams.get('type') || 'best' // 'best' | 'spread' | 'all'
    
    const exchangeManager = await ExchangeManager.getInstance()
    
    let result: any
    
    switch (type) {
      case 'best':
        // 获取最佳价格
        result = await exchangeManager.getBestPrice(symbol)
        break
        
      case 'spread':
        // 获取价格差异
        result = await exchangeManager.getPriceSpread(symbol)
        break
        
      case 'all':
        // 获取所有交易所价格
        const bestPrice = await exchangeManager.getBestPrice(symbol)
        const spread = await exchangeManager.getPriceSpread(symbol)
        result = {
          symbol,
          bestPrice: bestPrice.price,
          bestExchange: bestPrice.exchange,
          spread: spread.spread,
          spreadPercent: spread.spreadPercent,
          allPrices: bestPrice.allPrices
        }
        break
        
      default:
        return NextResponse.json(
          {
            success: false,
            error: '无效的类型参数，支持: best, spread, all',
            message: '参数错误'
          },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '价格数据获取成功'
    })
  } catch (error) {
    console.error('获取多交易所价格失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '获取价格数据失败'
      },
      { status: 500 }
    )
  }
} 