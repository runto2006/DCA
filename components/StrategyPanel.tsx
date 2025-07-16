'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Target, BarChart3, Brain, Zap, Activity, RefreshCw } from 'lucide-react'

interface StrategyData {
  emaScore: number
  obvScore: number
  rsiScore: number
  macdScore: number
  totalScore: number
  recommendation: string
  current_price: number
  timestamp: string
  isMock?: boolean
}

export default function StrategyPanel() {
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null)
  const [loading, setLoading] = useState(true)

  // 获取策略数据
  const fetchStrategy = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/strategy')
      const data = await response.json()
      setStrategyData(data)
      setLoading(false)
    } catch (error) {
      console.error('获取策略数据失败:', error)
      setLoading(false)
    }
  }

  // 自动刷新策略数据（每60秒）
  useEffect(() => {
    fetchStrategy()
    const interval = setInterval(fetchStrategy, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !strategyData) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">策略评分</h2>
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!strategyData) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">策略评分</h2>
        <div className="text-center text-gray-500">暂无数据</div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'SELL':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY':
        return <TrendingUp className="w-5 h-5" />
      case 'SELL':
        return <TrendingDown className="w-5 h-5" />
      default:
        return <Minus className="w-5 h-5" />
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">策略评分</h2>
        <button
          onClick={fetchStrategy}
          disabled={loading}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      
      <div className="space-y-6">
        {/* 总评分 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700">
            <span className={`text-2xl font-bold ${getScoreColor(strategyData.totalScore)}`}>
              {strategyData.totalScore}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">综合评分</p>
        </div>

        {/* 建议 */}
        <div className={`p-4 rounded-lg border ${getRecommendationColor(strategyData.recommendation)}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">建议操作</span>
            {getRecommendationIcon(strategyData.recommendation)}
          </div>
          <p className="mt-1 text-lg font-bold">{strategyData.recommendation}</p>
        </div>

        {/* 各项指标评分 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">指标详情</h3>
          
          {/* EMA评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">EMA89</span>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.emaScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(strategyData.emaScore)}`}>
                {strategyData.emaScore}
              </span>
            </div>
          </div>

          {/* OBV评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">OBV</span>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.obvScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(strategyData.obvScore)}`}>
                {strategyData.obvScore}
              </span>
            </div>
          </div>

          {/* RSI评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">RSI</span>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.rsiScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(strategyData.rsiScore)}`}>
                {strategyData.rsiScore}
              </span>
            </div>
          </div>

          {/* MACD评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">MACD</span>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.macdScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(strategyData.macdScore)}`}>
                {strategyData.macdScore}
              </span>
            </div>
          </div>
        </div>

        {/* 当前价格 */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">当前价格</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              ${strategyData.current_price?.toFixed(2) || 'N/A'}
            </span>
          </div>
        </div>

        {/* 更新时间 */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            更新时间: {new Date(strategyData.timestamp).toLocaleString('zh-CN')}
          </p>
          {strategyData.isMock && (
            <p className="text-xs text-yellow-600 mt-1">模拟数据</p>
          )}
        </div>
      </div>
    </div>
  )
} 