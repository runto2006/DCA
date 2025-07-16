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

  // 获取价格数据
  const fetchPriceData = async () => {
    try {
      const response = await fetch('/api/price')
      const data = await response.json()
      setPriceData(data)
    } catch (error) {
      console.error('获取价格数据失败:', error)
    }
  }

  // 获取策略数据
  const fetchStrategyData = async () => {
    try {
      const response = await fetch('/api/strategy')
      const data = await response.json()
      setStrategyData(data)
    } catch (error) {
      console.error('获取策略数据失败:', error)
    }
  }

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      await Promise.all([fetchPriceData(), fetchStrategyData()])
      setLoading(false)
    }
    initData()
  }, [])

  // 定时刷新数据
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPriceData()
      fetchStrategyData()
    }, 30000) // 每30秒刷新一次

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                SOLBTC DCA 轮动模型追踪系统
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                实时追踪 SOL/USDT 价格与策略评分
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                最后更新: {new Date().toLocaleString('zh-CN')}
              </p>
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
            <PriceDisplay data={priceData} />
            
            {/* 策略评分面板 */}
            <StrategyPanel data={strategyData} />
          </div>

          {/* 右侧面板 */}
          <div className="space-y-8">
            {/* 持仓管理 */}
            <PositionManager />
            
            {/* 交易历史 */}
            <TradeHistory />
          </div>
        </div>
      </main>
    </div>
  )
} 