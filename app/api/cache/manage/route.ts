import { NextResponse } from 'next/server'
import { redisCache } from '@/lib/cache/redis-cache'
import { ApiResponseHandler } from '@/lib/api/response-handler'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const symbol = searchParams.get('symbol')
    const exchange = searchParams.get('exchange') || 'binance'
    
    let result: any = {}
    
    switch (type) {
      case 'price':
        if (symbol) {
          await redisCache.invalidatePrice(symbol, exchange)
          result.message = `已清除 ${symbol} 的价格缓存`
        } else {
          await redisCache.invalidateAllPrices()
          result.message = '已清除所有价格缓存'
        }
        break
        
      case 'strategy':
        await redisCache.invalidateAllStrategies()
        result.message = '已清除所有策略缓存'
        break
        
      case 'symbols':
        await redisCache.invalidateSymbols(exchange)
        result.message = `已清除 ${exchange} 的币种列表缓存`
        break
        
      case 'all':
      default:
        await redisCache.invalidateAllPrices()
        await redisCache.invalidateAllStrategies()
        await redisCache.invalidateSymbols(exchange)
        result.message = '已清除所有缓存'
        break
    }
    
    const stats = await redisCache.getCacheStats()
    result.stats = stats
    
    return NextResponse.json(
      ApiResponseHandler.success(result, '缓存清除成功')
    )
  } catch (error) {
    console.error('缓存清除失败:', error)
    
    return NextResponse.json(
      ApiResponseHandler.serverError('缓存清除失败'),
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const stats = await redisCache.getCacheStats()
    
    return NextResponse.json(
      ApiResponseHandler.success(stats, '缓存统计信息')
    )
  } catch (error) {
    console.error('获取缓存统计失败:', error)
    
    return NextResponse.json(
      ApiResponseHandler.serverError('获取缓存统计失败'),
      { status: 500 }
    )
  }
} 