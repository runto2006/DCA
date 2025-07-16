'use client'

import { useState, useEffect } from 'react'
import PriceDisplay from '@/components/PriceDisplay'
import StrategyPanel from '@/components/StrategyPanel'
import PositionManager from '@/components/PositionManager'
import TradeHistory from '@/components/TradeHistory'

export default function Home() {
  const [priceData, setPriceData] = useState<any>(null)
  const [strategyData, setStrategyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  // 获取价格数据
  const fetchPriceData = async () => {
    try {
      const response = await fetch('/api/price')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setPriceData(data)
    } catch (error) {
      console.error('获取价格数据失败:', error)
      setPriceData({
        price: 0,
        price_btc: 0,
        volume_24h: 0,
        market_cap: 0,
        timestamp: new Date().toISOString(),
        error: true
      })
    }
  }

  // 获取策略数据
  const fetchStrategyData = async () => {
    try {
      const response = await fetch('/api/strategy')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setStrategyData(data)
    } catch (error) {
      console.error('获取策略数据失败:', error)
      setStrategyData({
        emaScore: 50,
        obvScore: 50,
        rsiScore: 50,
        macdScore: 50,
        totalScore: 50,
        recommendation: 'HOLD',
        current_price: 0,
        timestamp: new Date().toISOString(),
        error: true
      })
    }
  }

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.all([fetchPriceData(), fetchStrategyData()])
      } catch (error) {
        console.error('初始化数据失败:', error)
        setError('数据初始化失败，请检查网络连接')
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [])

  // 定时刷新数据
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPriceData()
      fetchStrategyData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <p className="mt-6 text-lg font-medium text-slate-600 dark:text-slate-400">正在加载 SOLBTC DCA 系统...</p>
          <div className="mt-2 flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">系统初始化失败</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 头部 */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  SOLBTC DCA 轮动模型
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  实时追踪与策略评分系统
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-600 dark:text-slate-400">最后更新</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date().toLocaleString('zh-CN')}
                </p>
              </div>
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200"
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧面板 */}
          <div className="space-y-8">
            {/* 价格显示 */}
            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <PriceDisplay data={priceData} />
            </div>
            
            {/* 策略评分面板 */}
            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <StrategyPanel data={strategyData} />
            </div>
          </div>

          {/* 右侧面板 */}
          <div className="space-y-8">
            {/* 持仓管理 */}
            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <PositionManager />
            </div>
            
            {/* 交易历史 */}
            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <TradeHistory />
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>系统运行正常</span>
              </div>
              <span>•</span>
              <span>数据源: CoinGecko API</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>版本: v1.0.0</span>
              <span>•</span>
              <span>© 2024 SOLBTC DCA</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 