'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PriceDisplayProps {
  data: {
    price: number
    price_btc: number
    volume_24h: number
    market_cap: number
    timestamp: string
  } | null
}

export default function PriceDisplay({ data }: PriceDisplayProps) {
  if (!data) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">实时价格</h2>
        <div className="text-center text-gray-500">暂无数据</div>
      </div>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(2)}B`
    } else if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(2)}M`
    } else if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(2)}K`
    }
    return volume.toFixed(2)
  }

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) {
      return `${(marketCap / 1e12).toFixed(2)}T`
    } else if (marketCap >= 1e9) {
      return `${(marketCap / 1e9).toFixed(2)}B`
    } else if (marketCap >= 1e6) {
      return `${(marketCap / 1e6).toFixed(2)}M`
    }
    return marketCap.toFixed(2)
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">实时价格</h2>
      
      <div className="space-y-4">
        {/* SOL/USDT 价格 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">SOL/USDT</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPrice(data.price)}
          </span>
        </div>

        {/* SOL/BTC 价格 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">SOL/BTC</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.price_btc.toFixed(8)}
          </span>
        </div>

        {/* 24小时成交量 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">24h 成交量</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            ${formatVolume(data.volume_24h)}
          </span>
        </div>

        {/* 市值 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">市值</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            ${formatMarketCap(data.market_cap)}
          </span>
        </div>

        {/* 更新时间 */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            更新时间: {new Date(data.timestamp).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>
    </div>
  )
} 