'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, TrendingUpIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, formatNumber, getPriceChangeColor, debounce } from '@/lib/utils'

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
  const [priceChange, setPriceChange] = useState<number>(0)

  // 获取价格数据
  const fetchPrice = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/price')
      const data = await response.json()
      
      // 计算价格变化
      if (priceData) {
        const change = ((data.price - priceData.price) / priceData.price) * 100
        setPriceChange(change)
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
  }, [])

  if (loading && !priceData) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h2 className="text-xl font-semibold mb-4">实时价格</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      </motion.div>
    )
  }

  if (!priceData) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h2 className="text-xl font-semibold mb-4">实时价格</h2>
        <div className="text-center text-gray-500 py-8">
          <TrendingUpIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>无法获取价格数据</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          实时价格
        </h2>
        <button
          onClick={debouncedFetch}
          disabled={loading}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="space-y-6">
        {/* 主要价格信息 */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={priceData.price}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
            >
              {formatCurrency(priceData.price)}
            </motion.div>
          </AnimatePresence>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {priceData.price_btc.toFixed(8)} BTC
          </div>
          
          {/* 价格变化指示器 */}
          {priceChange !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-center text-sm font-medium ${getPriceChangeColor(priceChange)}`}
            >
              {priceChange > 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </motion.div>
          )}
          
          {priceData.isMock && (
            <div className="text-xs text-yellow-600 mt-2 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full inline-block">
              模拟数据
            </div>
          )}
        </div>

        {/* 市场数据 */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-700/50"
          >
            <div className="text-gray-600 dark:text-gray-400 mb-1 text-sm">24h成交量</div>
            <div className="font-semibold text-lg">${formatNumber(priceData.volume_24h)}</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border border-purple-200/50 dark:border-purple-700/50"
          >
            <div className="text-gray-600 dark:text-gray-400 mb-1 text-sm">市值</div>
            <div className="font-semibold text-lg">${formatNumber(priceData.market_cap)}</div>
          </motion.div>
        </div>

        {/* 更新时间 */}
        {lastUpdate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200/50 dark:border-gray-700/50"
          >
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
} 