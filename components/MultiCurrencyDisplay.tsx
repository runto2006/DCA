'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, BarChart3, Star, Settings, Plus, Filter } from 'lucide-react'
import { formatCurrency, formatNumber, getPriceChangeColor } from '@/lib/utils'

interface CurrencyData {
  symbol: string
  name: string
  price_usdt: number
  price_btc?: number
  volume_24h: number
  market_cap: number
  price_change_24h: number
  price_change_7d: number
  high_24h: number
  low_24h: number
  total_score?: number
  recommendation?: string
  risk_level?: string
  timestamp: string
}

interface CurrencyConfig {
  symbol: string
  name: string
  full_name: string
  trading_pair: string
  is_active: boolean
  risk_level: string
  description: string
  icon_url?: string
}

export default function MultiCurrencyDisplay() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([])
  const [currencyConfigs, setCurrencyConfigs] = useState<CurrencyConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('market_cap')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  // 获取币种配置
  const fetchCurrencyConfigs = async () => {
    try {
      const response = await fetch('/api/multi-currency?action=list')
      const result = await response.json()
      
      if (result.success) {
        setCurrencyConfigs(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取币种配置失败:', error)
    }
  }

  // 获取价格数据
  const fetchPrices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/multi-currency?action=prices&limit=50')
      const result = await response.json()
      
      if (result.success) {
        setCurrencies(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取价格数据失败:', error)
      setError(error instanceof Error ? error.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取策略评分
  const fetchScores = async () => {
    try {
      const response = await fetch('/api/multi-currency?action=scores&limit=50')
      const result = await response.json()
      
      if (result.success) {
        // 合并价格数据和评分数据
        setCurrencies(prev => prev.map(currency => {
          const scoreData = result.data.find((s: any) => s.symbol === currency.symbol)
          return {
            ...currency,
            total_score: scoreData?.total_score,
            recommendation: scoreData?.recommendation,
            risk_level: scoreData?.risk_level
          }
        }))
      }
    } catch (error) {
      console.error('获取策略评分失败:', error)
    }
  }

  // 刷新数据
  const refreshData = async () => {
    await Promise.all([fetchPrices(), fetchScores()])
  }

  // 切换收藏
  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    )
  }

  // 排序数据
  const sortedCurrencies = currencies
    .filter(currency => {
      if (selectedCurrency !== 'ALL' && currency.symbol !== selectedCurrency) {
        return false
      }
      if (showFavorites && !favorites.includes(currency.symbol)) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof CurrencyData]
      let bValue: any = b[sortBy as keyof CurrencyData]
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  // 获取推荐颜色
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return 'text-green-600 bg-green-100'
      case 'BUY':
        return 'text-blue-600 bg-blue-100'
      case 'HOLD':
        return 'text-yellow-600 bg-yellow-100'
      case 'SELL':
        return 'text-orange-600 bg-orange-100'
      case 'STRONG_SELL':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // 获取风险等级颜色
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'text-green-600'
      case 'MEDIUM':
        return 'text-yellow-600'
      case 'HIGH':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  useEffect(() => {
    fetchCurrencyConfigs()
    fetchPrices()
    fetchScores()
    
    // 从localStorage加载收藏
    const savedFavorites = localStorage.getItem('currency_favorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  useEffect(() => {
    // 保存收藏到localStorage
    localStorage.setItem('currency_favorites', JSON.stringify(favorites))
  }, [favorites])

  if (loading && currencies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500">加载多币种数据...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-red-500">错误: {error}</div>
        <button 
          onClick={refreshData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">多币种行情</h2>
          <span className="text-sm text-gray-500">({sortedCurrencies.length} 个币种)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`p-2 rounded-lg ${
              showFavorites 
                ? 'bg-yellow-100 text-yellow-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="显示收藏"
          >
            <Star className="w-4 h-4" />
          </button>
          
          <button
            onClick={refreshData}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 筛选和排序 */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">币种:</label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">全部</option>
            {currencyConfigs.map(config => (
              <option key={config.symbol} value={config.symbol}>
                {config.name} ({config.symbol})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">排序:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="market_cap">市值</option>
            <option value="price_usdt">价格</option>
            <option value="price_change_24h">24h涨跌</option>
            <option value="volume_24h">成交量</option>
            <option value="total_score">评分</option>
            <option value="symbol">币种</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* 币种列表 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">收藏</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">币种</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">价格</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">24h涨跌</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">市值</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">成交量</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">评分</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">推荐</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">风险</th>
            </tr>
          </thead>
          <tbody>
            {sortedCurrencies.map((currency) => (
              <tr key={currency.symbol} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-3 px-2">
                  <button
                    onClick={() => toggleFavorite(currency.symbol)}
                    className={`p-1 rounded ${
                      favorites.includes(currency.symbol)
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </td>
                
                <td className="py-3 px-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                      {currency.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{currency.symbol}</div>
                      <div className="text-xs text-gray-500">{currency.name}</div>
                    </div>
                  </div>
                </td>
                
                <td className="py-3 px-2 text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(currency.price_usdt)}
                  </div>
                  {currency.price_btc && (
                    <div className="text-xs text-gray-500">
                      {currency.price_btc.toFixed(8)} BTC
                    </div>
                  )}
                </td>
                
                <td className="py-3 px-2 text-right">
                  <div className={`flex items-center justify-end space-x-1 ${getPriceChangeColor(currency.price_change_24h)}`}>
                    {currency.price_change_24h > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="font-medium">
                      {currency.price_change_24h > 0 ? '+' : ''}{currency.price_change_24h.toFixed(2)}%
                    </span>
                  </div>
                </td>
                
                <td className="py-3 px-2 text-right">
                  <div className="text-gray-900 dark:text-white">
                    ${formatNumber(currency.market_cap)}
                  </div>
                </td>
                
                <td className="py-3 px-2 text-right">
                  <div className="text-gray-900 dark:text-white">
                    ${formatNumber(currency.volume_24h)}
                  </div>
                </td>
                
                <td className="py-3 px-2 text-right">
                  {currency.total_score ? (
                    <div className="font-medium text-gray-900 dark:text-white">
                      {currency.total_score}
                    </div>
                  ) : (
                    <div className="text-gray-400">-</div>
                  )}
                </td>
                
                <td className="py-3 px-2 text-right">
                  {currency.recommendation ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(currency.recommendation)}`}>
                      {currency.recommendation}
                    </span>
                  ) : (
                    <div className="text-gray-400">-</div>
                  )}
                </td>
                
                <td className="py-3 px-2 text-right">
                  {currency.risk_level ? (
                    <span className={`text-xs font-medium ${getRiskLevelColor(currency.risk_level)}`}>
                      {currency.risk_level}
                    </span>
                  ) : (
                    <div className="text-gray-400">-</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            最后更新: {currencies[0]?.timestamp ? new Date(currencies[0].timestamp).toLocaleString() : '-'}
          </div>
          <div>
            数据来源: 币安API
          </div>
        </div>
      </div>
    </div>
  )
} 