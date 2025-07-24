export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: number
  message?: string
  timestamp: string
  cache?: {
    hit: boolean
    ttl?: number
  }
}

export class ApiResponseHandler {
  static success<T>(data: T, message?: string, cacheInfo?: { hit: boolean; ttl?: number }): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      ...(cacheInfo && { cache: cacheInfo })
    }
  }

  static error(error: string, code: number = 500, message?: string): ApiResponse {
    return {
      success: false,
      error,
      code,
      message,
      timestamp: new Date().toISOString()
    }
  }

  static validationError(errors: string[]): ApiResponse {
    return {
      success: false,
      error: 'Validation Error',
      code: 400,
      message: errors.join(', '),
      timestamp: new Date().toISOString()
    }
  }

  static notFound(resource: string): ApiResponse {
    return {
      success: false,
      error: 'Not Found',
      code: 404,
      message: `${resource} not found`,
      timestamp: new Date().toISOString()
    }
  }

  static unauthorized(message: string = 'Unauthorized'): ApiResponse {
    return {
      success: false,
      error: 'Unauthorized',
      code: 401,
      message,
      timestamp: new Date().toISOString()
    }
  }

  static forbidden(message: string = 'Forbidden'): ApiResponse {
    return {
      success: false,
      error: 'Forbidden',
      code: 403,
      message,
      timestamp: new Date().toISOString()
    }
  }

  static rateLimitExceeded(message: string = 'Rate limit exceeded'): ApiResponse {
    return {
      success: false,
      error: 'Rate Limit Exceeded',
      code: 429,
      message,
      timestamp: new Date().toISOString()
    }
  }

  static serverError(message: string = 'Internal server error'): ApiResponse {
    return {
      success: false,
      error: 'Internal Server Error',
      code: 500,
      message,
      timestamp: new Date().toISOString()
    }
  }
}

// 中间件：统一错误处理
export function errorHandler(error: any, req: any, res: any, next: any) {
  console.error('API Error:', error)

  // 处理已知错误类型
  if (error.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponseHandler.validationError([error.message])
    )
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json(
      ApiResponseHandler.unauthorized(error.message)
    )
  }

  if (error.code === 'ENOTFOUND') {
    return res.status(503).json(
      ApiResponseHandler.error('Service Unavailable', 503, 'External service is not available')
    )
  }

  // 默认服务器错误
  return res.status(500).json(
    ApiResponseHandler.serverError(error.message || 'An unexpected error occurred')
  )
}

// 中间件：API限流
export function rateLimiter(limit: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return (req: any, res: any, next: any) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    
    const userRequests = requests.get(key)
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }
    
    if (userRequests.count >= limit) {
      return res.status(429).json(
        ApiResponseHandler.rateLimitExceeded()
      )
    }
    
    userRequests.count++
    next()
  }
}

// 中间件：请求日志
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`)
  })
  
  next()
}

// 工具函数：验证必需参数
export function validateRequiredParams(params: any, requiredFields: string[]): string[] {
  const errors: string[] = []
  
  for (const field of requiredFields) {
    if (!params[field] || params[field].toString().trim() === '') {
      errors.push(`${field} is required`)
    }
  }
  
  return errors
}

// 工具函数：验证币种格式
export function validateCurrency(currency: string): boolean {
  const validCurrencies = ['USD', 'CNY', 'EUR', 'JPY', 'GBP']
  return validCurrencies.includes(currency.toUpperCase())
}

// 工具函数：验证交易对格式
export function validateSymbol(symbol: string): boolean {
  // 基本格式验证：字母数字组合，通常包含USDT、BTC等
  const symbolPattern = /^[A-Z0-9]+(USDT|BTC|ETH|BNB|SOL)$/i
  return symbolPattern.test(symbol.toUpperCase())
} 