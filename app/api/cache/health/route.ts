import { NextResponse } from 'next/server'
import { redisCache } from '@/lib/cache/redis-cache'
import { ApiResponseHandler } from '@/lib/api/response-handler'

export async function GET() {
  try {
    const isHealthy = await redisCache.isHealthy()
    const stats = await redisCache.getCacheStats()
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      redis: {
        connected: isHealthy,
        stats
      },
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(
      ApiResponseHandler.success(healthData, '缓存健康检查完成')
    )
  } catch (error) {
    console.error('缓存健康检查失败:', error)
    
    return NextResponse.json(
      ApiResponseHandler.serverError('缓存健康检查失败'),
      { status: 500 }
    )
  }
} 