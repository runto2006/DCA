'use client'

import PriceDisplay from '@/components/PriceDisplay'
import StrategyPanel from '@/components/StrategyPanel'
import PositionManager from '@/components/PositionManager'
import TradeHistory from '@/components/TradeHistory'
import TvlDisplay from '@/components/TvlDisplay'
import RealTradePanel from '@/components/RealTradePanel'
import DCAAutoTradePanel from '@/components/DCAAutoTradePanel'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 现代化导航栏 */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SOLBTC DCA 系统
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>实时监控</span>
              <span>•</span>
              <span>智能策略</span>
              <span>•</span>
              <span>风险控制</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* 页面标题 - 优化版 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            SOLBTC DCA 轮动模型追踪系统
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            基于技术指标的智能交易策略管理系统，实时监控市场动态，智能执行DCA策略
          </p>
        </div>

        {/* Solana生态TVL数据 - 全宽显示 */}
        <div className="mb-8">
          <TvlDisplay />
        </div>

        {/* 主要内容区域 - 优化响应式布局 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* 左侧：价格和策略 */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PriceDisplay />
              <StrategyPanel />
            </div>
          </div>

          {/* 右侧：持仓管理 */}
          <div className="space-y-6">
            <PositionManager />
          </div>
        </div>

        {/* DCA自动交易面板 - 全宽 */}
        <div className="mb-8">
          <DCAAutoTradePanel />
        </div>

        {/* 真实交易面板 - 全宽 */}
        <div className="mb-8">
          <RealTradePanel />
        </div>

        {/* 底部：交易历史 - 全宽 */}
        <div className="mb-8">
          <TradeHistory />
        </div>

        {/* 页脚信息 - 优化版 */}
        <footer className="text-center py-8 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div>
              <h4 className="font-semibold mb-2">数据来源</h4>
              <p>CoinGecko API</p>
              <p>DefiLlama API</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">技术指标</h4>
              <p>EMA89, OBV, RSI, MACD</p>
              <p>智能DCA策略</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">风险提示</h4>
              <p>⚠️ 仅供学习研究</p>
              <p>不构成投资建议</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
} 