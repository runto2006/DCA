'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react'
import { formatCurrency, formatNumber, getPriceChangeColor, debounce } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'

interface PriceData {
  symbol: string
  price: number
  price_btc: number
  volume_24h: number
  market_cap: number
  timestamp: string
  isMock?: boolean
}

export default function PriceDisplay() {
  const { currentSymbol } = useCurrency()
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)

  // 获取价格数据
  const fetchPrice = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/price?symbol=${currentSymbol}`)
      const data = await response.json()
      
      // 计算价格变化 - 只有当币种相同时才计算
      if (priceData && priceData.symbol === currentSymbol) {
        const change = ((data.price - priceData.price) / priceData.price) * 100
        // 限制价格变化范围，避免异常值
        if (Math.abs(change) < 50) { // 如果变化超过50%，可能是币种切换导致的，不显示
          setPriceChange(change)
        } else {
          setPriceChange(0)
        }
      } else {
        // 币种切换时重置价格变化
        setPriceChange(0)
      }
      
      setPriceData(data)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error('获取价格数据失败:', error)
      setLoading(false)
    }
  }

  // 防抖的刷新函数
  const debouncedFetch = debounce(fetchPrice, 1000)

  // 自动刷新价格（每30秒）
  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [currentSymbol]) // 添加currentSymbol依赖

  if (loading && !priceData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">加载价格数据...</span>
        </div>
      </div>
    )
  }

  if (!priceData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center text-gray-500">
          <DollarSign className="w-4 h-4 mr-2" />
          <span className="text-sm">无法获取价格数据</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        {/* 左侧：价格信息 */}
        <div className="flex items-center space-x-6">
          {/* 主要价格 */}
          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(priceData.price)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {priceData.price_btc.toFixed(8)} BTC
              </div>
            </div>
          </div>

          {/* 价格变化指示器 */}
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
        </div>

        {/* 中间：市场数据 */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600 dark:text-gray-400">24h成交量</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${formatNumber(priceData.volume_24h)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-gray-600 dark:text-gray-400">市值</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${formatNumber(priceData.market_cap)}
            </span>
          </div>
        </div>

        {/* 右侧：刷新按钮和更新时间 */}
        <div className="flex items-center space-x-4">
          {priceData.isMock && (
            <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
              模拟数据
            </div>
          )}
          
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              {lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          
          <button
            onClick={debouncedFetch}
            disabled={loading}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="刷新价格"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  )
} 