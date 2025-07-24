'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react'

interface ExchangeStatus {
  name: string
  isActive: boolean
  hasConfig: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE'
}

interface HealthCheck {
  name: string
  healthy: boolean
  error?: string
}

interface PriceData {
  symbol: string
  bestPrice: number
  bestExchange: string
  spread: number
  spreadPercent: number
  allPrices: Array<{exchange: string, price: number}>
}

export default function MultiExchangeStatus() {
  const [exchangeStatuses, setExchangeStatuses] = useState<ExchangeStatus[]>([])
  const [healthCheck, setHealthCheck] = useState<HealthCheck[]>([])
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 获取交易所状态
  const fetchExchangeStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/exchanges/status')
      const result = await response.json()

      if (result.success) {
        setExchangeStatuses(result.data.configSummary)
        setHealthCheck(result.data.healthCheck)
        setError(null)
      } else {
        setError(result.error || '获取交易所状态失败')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }

  // 获取价格数据
  const fetchPriceData = async () => {
    try {
      const response = await fetch('/api/exchanges/price?symbol=SOLUSDT&type=all')
      const result = await response.json()

      if (result.success) {
        setPriceData(result.data)
      }
    } catch (error) {
      console.error('获取价格数据失败:', error)
    }
  }

  // 刷新数据
  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchExchangeStatus(), fetchPriceData()])
    setRefreshing(false)
  }

  // 初始加载
  useEffect(() => {
    fetchExchangeStatus()
    fetchPriceData()
  }, [])

  // 获取状态图标
  const getStatusIcon = (status: string, healthy: boolean) => {
    if (status === 'ACTIVE' && healthy) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (status === 'ERROR') {
      return <XCircle className="w-5 h-5 text-red-500" />
    } else if (status === 'MAINTENANCE') {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    } else {
      return <XCircle className="w-5 h-5 text-gray-400" />
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string, healthy: boolean) => {
    if (status === 'ACTIVE' && healthy) {
      return 'bg-green-50 border-green-200 text-green-800'
    } else if (status === 'ERROR') {
      return 'bg-red-50 border-red-200 text-red-800'
    } else if (status === 'MAINTENANCE') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    } else {
      return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">多交易所状态</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 交易所状态 */}
      <div className="p-6 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">交易所状态</h3>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {exchangeStatuses.map((exchange, index) => {
            const health = healthCheck.find(h => h.name === exchange.name)
            const healthy = health?.healthy || false
            
            return (
              <motion.div
                key={exchange.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getStatusColor(exchange.status, healthy)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold capitalize">{exchange.name}</span>
                  {getStatusIcon(exchange.status, healthy)}
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>配置:</span>
                    <span className={exchange.hasConfig ? 'text-green-600' : 'text-red-600'}>
                      {exchange.hasConfig ? '已配置' : '未配置'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>状态:</span>
                    <span className={healthy ? 'text-green-600' : 'text-red-600'}>
                      {healthy ? '正常' : '异常'}
                    </span>
                  </div>
                  {health?.error && (
                    <div className="text-xs text-red-600 truncate" title={health.error}>
                      错误: {health.error}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 价格聚合 */}
      {priceData && (
        <div className="p-6 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">价格聚合</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-600 mb-1">最佳价格</div>
              <div className="text-xl font-bold text-green-800">
                ${priceData.bestPrice.toFixed(2)}
              </div>
              <div className="text-sm text-green-600">
                {priceData.bestExchange.toUpperCase()}
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">价差</div>
              <div className="text-xl font-bold text-blue-800">
                ${priceData.spread.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600">
                {priceData.spreadPercent.toFixed(2)}%
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">交易所数量</div>
              <div className="text-xl font-bold text-purple-800">
                {priceData.allPrices.length}
              </div>
              <div className="text-sm text-purple-600">个交易所</div>
            </div>
          </div>

          {/* 各交易所价格对比 */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">各交易所价格对比</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priceData.allPrices.map((price, index) => (
                <div
                  key={price.exchange}
                  className={`p-3 rounded-lg border ${
                    price.exchange === priceData.bestExchange
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-sm font-medium capitalize text-gray-600">
                    {price.exchange}
                  </div>
                  <div className="text-lg font-bold text-gray-800">
                    ${price.price.toFixed(2)}
                  </div>
                  {price.exchange === priceData.bestExchange && (
                    <div className="text-xs text-green-600 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      最低价
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 