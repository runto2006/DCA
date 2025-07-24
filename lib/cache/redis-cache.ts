import Redis from 'ioredis'

// Redis缓存配置
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
}

export class RedisCache {
  private redis: Redis
  private isConnected: boolean = false

  constructor() {
    this.redis = new Redis(REDIS_CONFIG)
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis连接成功')
      this.isConnected = true
    })

    this.redis.on('error', (error) => {
      console.error('❌ Redis连接错误:', error.message)
      this.isConnected = false
    })

    this.redis.on('close', () => {
      console.log('⚠️ Redis连接关闭')
      this.isConnected = false
    })

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis重新连接中...')
    })
  }

  // 检查Redis连接健康状态
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch (error) {
      console.error('Redis健康检查失败:', error)
      return false
    }
  }

  // 价格数据缓存
  async getPrice(symbol: string, exchange: string = 'binance'): Promise<number | null> {
    try {
      const key = `price:${exchange}:${symbol}`
      const cached = await this.redis.get(key)
      return cached ? parseFloat(cached) : null
    } catch (error) {
      console.error('获取价格缓存失败:', error)
      return null
    }
  }

  async setPrice(symbol: string, price: number, exchange: string = 'binance', ttl: number = 30): Promise<void> {
    try {
      const key = `price:${exchange}:${symbol}`
      await this.redis.setex(key, ttl, price.toString())
    } catch (error) {
      console.error('设置价格缓存失败:', error)
    }
  }

  // 策略数据缓存
  async getStrategy(strategyType: string, params: string): Promise<any | null> {
    try {
      const key = `strategy:${strategyType}:${params}`
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('获取策略缓存失败:', error)
      return null
    }
  }

  async setStrategy(strategyType: string, params: string, data: any, ttl: number = 300): Promise<void> {
    try {
      const key = `strategy:${strategyType}:${params}`
      await this.redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('设置策略缓存失败:', error)
    }
  }

  // 币种列表缓存
  async getSymbols(exchange: string = 'binance'): Promise<string[] | null> {
    try {
      const key = `symbols:${exchange}`
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('获取币种列表缓存失败:', error)
      return null
    }
  }

  async setSymbols(symbols: string[], exchange: string = 'binance', ttl: number = 3600): Promise<void> {
    try {
      const key = `symbols:${exchange}`
      await this.redis.setex(key, ttl, JSON.stringify(symbols))
    } catch (error) {
      console.error('设置币种列表缓存失败:', error)
    }
  }

  // 历史数据缓存
  async getHistoryData(symbol: string, interval: string, limit: number): Promise<any[] | null> {
    try {
      const key = `history:${symbol}:${interval}:${limit}`
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('获取历史数据缓存失败:', error)
      return null
    }
  }

  async setHistoryData(symbol: string, interval: string, limit: number, data: any[], ttl: number = 300): Promise<void> {
    try {
      const key = `history:${symbol}:${interval}:${limit}`
      await this.redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('设置历史数据缓存失败:', error)
    }
  }

  // 缓存失效
  async invalidatePrice(symbol: string, exchange: string = 'binance'): Promise<void> {
    try {
      const key = `price:${exchange}:${symbol}`
      await this.redis.del(key)
    } catch (error) {
      console.error('失效价格缓存失败:', error)
    }
  }

  async invalidateStrategy(strategyType: string, params: string): Promise<void> {
    try {
      const key = `strategy:${strategyType}:${params}`
      await this.redis.del(key)
    } catch (error) {
      console.error('失效策略缓存失败:', error)
    }
  }

  async invalidateSymbols(exchange: string = 'binance'): Promise<void> {
    try {
      const key = `symbols:${exchange}`
      await this.redis.del(key)
    } catch (error) {
      console.error('失效币种列表缓存失败:', error)
    }
  }

  async invalidateHistoryData(symbol: string, interval: string, limit: number): Promise<void> {
    try {
      const key = `history:${symbol}:${interval}:${limit}`
      await this.redis.del(key)
    } catch (error) {
      console.error('失效历史数据缓存失败:', error)
    }
  }

  // 批量失效
  async invalidateAllPrices(exchange: string = 'binance'): Promise<void> {
    try {
      const pattern = `price:${exchange}:*`
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('批量失效价格缓存失败:', error)
    }
  }

  async invalidateAllStrategies(): Promise<void> {
    try {
      const pattern = 'strategy:*'
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('批量失效策略缓存失败:', error)
    }
  }

  // 缓存统计
  async getCacheStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate: number
    connected: boolean
  }> {
    try {
      const info = await this.redis.info('memory')
      const keys = await this.redis.dbsize()
      
      // 解析内存使用情况
      const memoryMatch = info.match(/used_memory_human:(\S+)/)
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0B'
      
      return {
        totalKeys: keys,
        memoryUsage,
        hitRate: 0, // Redis不直接提供命中率，需要额外实现
        connected: this.isConnected
      }
    } catch (error) {
      console.error('获取缓存统计失败:', error)
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        hitRate: 0,
        connected: false
      }
    }
  }

  // 清空所有缓存
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb()
      console.log('✅ 所有缓存已清空')
    } catch (error) {
      console.error('清空缓存失败:', error)
    }
  }

  // 关闭连接
  async close(): Promise<void> {
    try {
      await this.redis.quit()
      console.log('✅ Redis连接已关闭')
    } catch (error) {
      console.error('关闭Redis连接失败:', error)
    }
  }
}

// 导出单例实例
export const redisCache = new RedisCache() 