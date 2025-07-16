'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

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
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 获取价格数据
  const fetchPrice = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/price')
      const data = await response.json()
      setPriceData(data)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error('获取价格数据失败:', error)
      setLoading(false)
    }
  }

  // 自动刷新价格（每30秒）
  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(2)}B`
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(2)}M`
    } else if (volume >= 1e3) {
      return `$${(volume / 1e3).toFixed(2)}K`
    }
    return formatCurrency(volume)
  }

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`
    }
    return formatCurrency(marketCap)
  }

  if (loading && !priceData) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">实时价格</h2>
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!priceData) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">实时价格</h2>
        <div className="text-center text-gray-500">无法获取价格数据</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">实时价格</h2>
        <button
          onClick={fetchPrice}
          disabled={loading}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="space-y-4">
        {/* 主要价格信息 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {formatCurrency(priceData.price)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {priceData.price_btc.toFixed(8)} BTC
          </div>
          {priceData.isMock && (
            <div className="text-xs text-yellow-600 mt-1">模拟数据</div>
          )}
        </div>

        {/* 市场数据 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 mb-1">24h成交量</div>
            <div className="font-semibold">{formatVolume(priceData.volume_24h)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400 mb-1">市值</div>
            <div className="font-semibold">{formatMarketCap(priceData.market_cap)}</div>
          </div>
        </div>

        {/* 更新时间 */}
        {lastUpdate && (
          <div className="text-xs text-gray-500 text-center">
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </div>
        )}
      </div>
    </div>
  )
} 