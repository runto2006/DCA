'use client'

import PriceDisplay from '@/components/PriceDisplay'
import StrategyPanel from '@/components/StrategyPanel'
import PositionManager from '@/components/PositionManager'
import TradeHistory from '@/components/TradeHistory'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            SOLBTC DCA 轮动模型追踪系统
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            基于技术指标的智能交易策略管理系统
          </p>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 左侧：价格和策略 */}
          <div className="space-y-6">
            <PriceDisplay />
            <StrategyPanel />
          </div>

          {/* 右侧：持仓管理 */}
          <div className="space-y-6">
            <PositionManager />
          </div>
        </div>

        {/* 底部：交易历史 */}
        <div className="mb-8">
          <TradeHistory />
        </div>

        {/* 页脚信息 */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>数据来源：CoinGecko API | 技术指标：EMA89, OBV, RSI, MACD</p>
          <p className="mt-1">⚠️ 本系统仅供学习和研究使用，不构成投资建议</p>
        </div>
      </div>
    </div>
  )
} 