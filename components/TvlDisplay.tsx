'use client'

import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react'
import { formatCurrency, formatNumber, getPriceChangeColor, debounce } from '@/lib/utils'

interface TvlData {
  chain: string
  tvl: number
  tvl_change_1d: number
  tvl_change_7d: number
  tvl_change_30d: number
  timestamp: string
  source: string
  isMock?: boolean
}

interface TvlHistory {
  chain: string
  history: Array<{
    date: number
    tvl: number
  }>
}

interface PriceData {
  symbol: string
  price: number
  price_btc: number
  volume_24h: number
  market_cap: number
  timestamp: string
  isMock?: boolean
}

export default function TvlDisplay() {
  const [tvlData, setTvlData] = useState<TvlData | null>(null)
  const [tvlHistory, setTvlHistory] = useState<TvlHistory | null>(null)
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)

  useEffect(() => {
    fetchTvlData()
    fetchTvlHistory()
    fetchPriceData()
  }, [])

  const fetchTvlData = async () => {
    try {
      const response = await fetch('/api/tvl')
      if (!response.ok) {
        throw new Error('获取TVL数据失败')
      }
      const data = await response.json()
      setTvlData(data)
    } catch (err) {
      console.error('获取TVL数据失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const fetchTvlHistory = async () => {
    try {
      const response = await fetch('/api/tvl/history')
      if (!response.ok) {
        throw new Error('获取TVL历史数据失败')
      }
      const data = await response.json()
      setTvlHistory(data)
    } catch (err) {
      console.error('获取TVL历史数据失败:', err)
    }
  }

  // 获取价格数据
  const fetchPriceData = async () => {
    try {
      const response = await fetch('/api/price')
      const data = await response.json()
      
      // 计算价格变化
      if (priceData) {
        const change = ((data.price - priceData.price) / priceData.price) * 100
        setPriceChange(change)
      }
      
      setPriceData(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('获取价格数据失败:', error)
    }
  }

  // 防抖的刷新函数
  const debouncedFetch = debounce(() => {
    fetchTvlData()
    fetchTvlHistory()
    fetchPriceData()
  }, 1000)

  const formatTvl = (tvl: number) => {
    if (tvl >= 1e9) {
      return `$${(tvl / 1e9).toFixed(2)}B`
    } else if (tvl >= 1e6) {
      return `$${(tvl / 1e6).toFixed(2)}M`
    } else if (tvl >= 1e3) {
      return `$${(tvl / 1e3).toFixed(2)}K`
    }
    return `$${tvl.toFixed(2)}`
  }

  const formatChange = (change: number) => {
    const isPositive = change >= 0
    return (
      <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    )
  }

  // 生成TVL历史折线图配置
  const getChartOption = () => {
    if (!tvlHistory?.history) return {}

    const dates = tvlHistory.history.map(item => 
      new Date(item.date * 1000).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    )
    const values = tvlHistory.history.map(item => item.tvl / 1e9) // 转换为十亿

    return {
      title: {
        text: 'Solana TVL 30天趋势',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          const data = params[0]
          return `${data.name}<br/>TVL: $${data.value.toFixed(2)}B`
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: 'TVL (十亿美元)',
        axisLabel: {
          formatter: '{value}B'
        }
      },
      series: [{
        name: 'TVL',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: {
          color: '#6366f1',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(99, 102, 241, 0.3)'
            }, {
              offset: 1, color: 'rgba(99, 102, 241, 0.05)'
            }]
          }
        },
        itemStyle: {
          color: '#6366f1'
        }
      }],
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%'
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">获取数据失败</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <button
            onClick={debouncedFetch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!tvlData) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">市场数据</h2>
          <p className="text-sm text-gray-500 mt-1">
            实时价格 + Solana生态TVL
          </p>
        </div>
        <button
          onClick={debouncedFetch}
          className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          刷新
        </button>
      </div>

      {/* 实时价格栏 - 简化显示 */}
      {priceData && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6 border border-blue-100">
          <div className="flex items-center justify-between">
            {/* 左侧：价格信息 */}
            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(priceData.price)}
                </div>
                <div className="text-xs text-gray-600">
                  {priceData.price_btc.toFixed(8)} BTC
                </div>
              </div>
            </div>

            {/* 中间：价格变化指示器 */}
            {priceChange !== 0 && (
              <div className={`flex items-center text-sm font-medium ${getPriceChangeColor(priceChange)}`}>
                {priceChange > 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            )}

            {/* 右侧：状态信息 */}
            <div className="flex items-center space-x-4">
              {priceData.isMock && (
                <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                  模拟数据
                </div>
              )}
              
              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  {lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TVL历史折线图 */}
      {tvlHistory && (
        <div className="mb-6">
          <ReactECharts 
            option={getChartOption()} 
            style={{ height: '300px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      )}

      {/* 总TVL数据 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 text-white">
          <div className="text-sm opacity-90">总TVL</div>
          <div className="text-2xl font-bold">{formatTvl(tvlData.tvl)}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">24h变化</div>
          <div className="text-lg font-semibold">{formatChange(tvlData.tvl_change_1d)}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">7天变化</div>
          <div className="text-lg font-semibold">{formatChange(tvlData.tvl_change_7d)}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">30天变化</div>
          <div className="text-lg font-semibold">{formatChange(tvlData.tvl_change_30d)}</div>
        </div>
      </div>

      {/* 更新时间 */}
      <div className="text-xs text-gray-400 text-center pt-4 border-t">
        最后更新: {new Date(tvlData.timestamp).toLocaleString('zh-CN')}
      </div>
    </div>
  )
} 