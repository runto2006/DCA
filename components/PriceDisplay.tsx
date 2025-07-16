'use client'

import { TrendingUp, TrendingDown, Minus, DollarSign, Bitcoin, BarChart3, Globe } from 'lucide-react'

interface PriceDisplayProps {
  data: {
    price: number
    price_btc: number
    volume_24h: number
    market_cap: number
    timestamp: string
    error?: boolean
  } | null
}

export default function PriceDisplay({ data }: PriceDisplayProps) {
  if (!data) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          实时价格
        </h2>
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <p>暂无数据</p>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          实时价格
        </h2>
        <div className="text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium text-yellow-800 dark:text-yellow-200">数据获取失败</p>
          <p className="text-sm mt-1 text-yellow-600 dark:text-yellow-300">请检查网络连接或稍后重试</p>
        </div>
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
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-300">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
        <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
        实时价格
      </h2>
      
      <div className="space-y-6">
        {/* SOL/USDT 价格 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">SOL/USDT</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">美元价格</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatPrice(data.price)}
            </span>
          </div>
        </div>

        {/* SOL/BTC 价格 */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                <Bitcoin className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">SOL/BTC</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">比特币汇率</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              {data.price_btc.toFixed(8)}
            </span>
          </div>
        </div>

        {/* 24小时成交量 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200/50 dark:border-green-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">24h 成交量</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">交易活跃度</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              ${formatVolume(data.volume_24h)}
            </span>
          </div>
        </div>

        {/* 市值 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">市值</span>
                <p className="text-xs text-slate-500 dark:text-slate-500">市场总价值</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              ${formatMarketCap(data.market_cap)}
            </span>
          </div>
        </div>

        {/* 更新时间 */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">更新时间</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {new Date(data.timestamp).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 