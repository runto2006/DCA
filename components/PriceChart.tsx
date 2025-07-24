'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

interface PriceData {
  time: string
  price: number
  volume?: number
}

interface PriceChartProps {
  symbol?: string // 改为可选，优先使用全局币种
  data?: PriceData[] // 改为可选，支持动态获取
  height?: number
  showVolume?: boolean
  className?: string
  autoRefresh?: boolean
}

export function PriceChart({ 
  symbol: propSymbol, 
  data: propData, 
  height = 300, 
  showVolume = false,
  className = '',
  autoRefresh = true
}: PriceChartProps) {
  const { currentSymbol } = useCurrency()
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [chartType, setChartType] = useState<'line' | 'area'>('line')
  const [data, setData] = useState<PriceData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastPrice, setLastPrice] = useState<number>(0)

  // 使用全局币种或传入的币种
  const symbol = propSymbol || currentSymbol || 'SOLUSDT'

  // 获取价格数据
  const fetchPriceData = async () => {
    try {
      setIsLoading(true)
      
      // 并行获取当前价格和历史数据
      const [currentPriceResponse, historyResponse] = await Promise.all([
        fetch(`/api/price?symbol=${symbol}`),
        fetch(`/api/price/history?symbol=${symbol}&timeframe=${timeframe}`)
      ])
      
      const currentPriceResult = await currentPriceResponse.json()
      const historyResult = await historyResponse.json()
      
      if (currentPriceResult.success && currentPriceResult.data) {
        setLastPrice(currentPriceResult.data.price)
      }
      
      if (historyResult.success && historyResult.data && historyResult.data.length > 0) {
        // 使用真实的历史数据
        setData(historyResult.data)
        console.log(`成功获取 ${historyResult.data.length} 条历史价格数据`)
      } else {
        // 如果历史数据获取失败，使用当前价格生成模拟数据
        const currentPrice = currentPriceResult.success ? currentPriceResult.data.price : 190
        const fallbackData = generateHistoricalData(currentPrice, timeframe)
        setData(fallbackData)
        console.log('使用模拟历史数据')
      }
    } catch (error) {
      console.error('获取价格数据失败:', error)
      // 使用默认数据
      const defaultData = generateHistoricalData(190, timeframe)
      setData(defaultData)
      setLastPrice(190)
    } finally {
      setIsLoading(false)
    }
  }

  // 生成历史数据（改进的模拟数据）
  const generateHistoricalData = (currentPrice: number, tf: string): PriceData[] => {
    const data: PriceData[] = []
    const now = Date.now()
    
    let points = 24
    let interval = 3600000 // 1小时
    
    switch (tf) {
      case '1h':
        points = 60
        interval = 60000 // 1分钟
        break
      case '24h':
        points = 24
        interval = 3600000 // 1小时
        break
      case '7d':
        points = 168
        interval = 3600000 // 1小时
        break
      case '30d':
        points = 30
        interval = 86400000 // 1天
        break
    }

    // 生成更真实的价格走势
    let basePrice = currentPrice
    for (let i = points - 1; i >= 0; i--) {
      const time = new Date(now - i * interval)
      
      // 使用更复杂的价格模型
      const volatility = 0.015 // 1.5%的波动率
      const trend = Math.sin(i * 0.05) * 0.02 // 长期趋势
      const cycle = Math.sin(i * 0.2) * 0.01 // 短期周期
      const noise = (Math.random() - 0.5) * volatility
      
      // 价格变化
      const priceChange = basePrice * (trend + cycle + noise)
      basePrice = basePrice + priceChange
      
      // 确保价格合理
      const price = Math.max(basePrice, currentPrice * 0.3)
      
      data.push({
        time: time.toISOString(),
        price: parseFloat(price.toFixed(4)),
        volume: 750000 + Math.random() * 500000 + Math.sin(i * 0.3) * 200000
      })
    }
    
    return data
  }

  // 初始加载和币种变化时获取数据
  useEffect(() => {
    if (autoRefresh) {
      fetchPriceData()
    }
  }, [symbol, timeframe, autoRefresh])

  // 使用传入的数据或动态获取的数据
  const chartData = propData || data

  // 计算价格变化
  const priceChange = chartData.length > 1 ? chartData[chartData.length - 1].price - chartData[0].price : 0
  const priceChangePercent = chartData.length > 1 ? (priceChange / chartData[0].price) * 100 : 0
  const isPositive = priceChange >= 0

  // 格式化数据
  const formatData = (data: PriceData[]) => {
    return data.map((item, index) => ({
      ...item,
      time: new Date(item.time).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      index
    }))
  }

  const formattedData = formatData(chartData)

  // 处理时间框架变化
  const handleTimeframeChange = (tf: '1h' | '24h' | '7d' | '30d') => {
    setTimeframe(tf)
  }

  // 处理图表类型变化
  const handleChartTypeChange = (type: 'line' | 'area') => {
    setChartType(type)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className}`}
    >
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {symbol.replace('USDT', '')} 价格走势
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ${lastPrice.toFixed(2)}
            </span>
            <div className={`flex items-center space-x-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : priceChange === 0 ? (
                <Minus className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex space-x-2">
          {/* 刷新按钮 */}
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <motion.div
              animate={{ rotate: isLoading ? 360 : 0 }}
              transition={{ 
                duration: 1, 
                repeat: isLoading ? Infinity : 0,
                ease: 'linear'
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          </button>

          {/* 时间框架选择 */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* 图表类型选择 */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['line', 'area'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleChartTypeChange(type)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === type
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {type === 'line' ? '线图' : '面积图'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 图表 */}
      <div style={{ height }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '价格']}
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              </LineChart>
            ) : (
              <AreaChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '价格']}
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* 底部信息 */}
      {showVolume && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>24h成交量: ${chartData[chartData.length - 1]?.volume?.toLocaleString() || '0'}</span>
            <span>最高: ${Math.max(...chartData.map(d => d.price)).toFixed(2)}</span>
            <span>最低: ${Math.min(...chartData.map(d => d.price)).toFixed(2)}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// 简化的价格显示组件
export function SimplePriceDisplay({ 
  symbol, 
  price, 
  change, 
  className = '' 
}: { 
  symbol: string
  price: number
  change: number
  className?: string
}) {
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {symbol}
          </h4>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${price.toFixed(2)}
          </p>
        </div>
        <div className={`flex items-center space-x-1 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
      </div>
    </motion.div>
  )
} 