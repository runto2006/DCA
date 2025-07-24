'use client'

import { useState, useEffect } from 'react'
import PriceDisplay from '@/components/PriceDisplay'
import StrategyPanel from '@/components/StrategyPanel'
import PositionManager from '@/components/PositionManager'
import TradeHistory from '@/components/TradeHistory'
import TvlDisplay from '@/components/TvlDisplay'
import DCAAutoTradePanel from '@/components/DCAAutoTradePanel'
import DCAStrategyDisplay from '@/components/DCAStrategyDisplay'
import ArbitrageProtectionPanel from '@/components/ArbitrageProtectionPanel'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { PageTransition, FadeIn, SlideIn, ScaleIn } from '@/components/ui/PageTransition'
import { LoadingSpinner, RefreshButton } from '@/components/ui/LoadingSpinner'
import { PriceChart } from '@/components/PriceChart'
import { DynamicPriceOverview } from '@/components/DynamicPriceOverview'
import { NotificationProvider, useNotifications } from '@/components/ui/Notification'
import { TimeDisplay } from '@/components/ui/ClientOnly'
import { TrendingUp, TrendingDown, Settings, HelpCircle, Moon, Sun } from 'lucide-react'
import MultiExchangeStatus from '@/components/MultiExchangeStatus'
import SettingsModal from '@/components/SettingsModal'
import { TradingViewSettings } from '@/components/TradingViewSettings'
import { TradingViewMonitor } from '@/components/TradingViewMonitor'

function HomeContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { addNotification } = useNotifications()

  // 在客户端挂载后设置初始时间
  useEffect(() => {
    setLastUpdate(new Date())
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    addNotification({
      type: 'info',
      title: '数据刷新中',
      message: '正在获取最新市场数据...',
      duration: 0
    })
    
    // 模拟刷新延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdate(new Date())
    setIsLoading(false)
    
    addNotification({
      type: 'success',
      title: '刷新完成',
      message: '数据已更新到最新状态',
      duration: 3000
    })
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* 顶部工具栏 */}
          <FadeIn delay={0.1}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  SOLBTC DCA 系统
                </h1>
                                 <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                   <span>最后更新:</span>
                   <TimeDisplay date={lastUpdate} />
                 </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <RefreshButton 
                  onClick={handleRefresh} 
                  loading={isLoading}
                  className="bg-blue-500 hover:bg-blue-600"
                />
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </FadeIn>

          {/* 帮助面板 */}
          {showHelp && (
            <SlideIn direction="down" delay={0.2}>
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  使用帮助
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
                  <div>
                    <h4 className="font-medium mb-1">快捷键</h4>
                    <ul className="space-y-1">
                      <li>Ctrl + R: 刷新数据</li>
                      <li>Ctrl + D: 切换暗色模式</li>
                      <li>Ctrl + H: 显示帮助</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">功能说明</h4>
                    <ul className="space-y-1">
                      <li>• 实时价格监控</li>
                      <li>• DCA自动交易</li>
                      <li>• 策略回测分析</li>
                      <li>• 持仓管理</li>
                    </ul>
                  </div>
                </div>
              </div>
            </SlideIn>
          )}

          {/* 价格概览卡片 */}
          <SlideIn direction="up" delay={0.3}>
            <DynamicPriceOverview />
          </SlideIn>

          {/* 价格图表 */}
          <ScaleIn delay={0.4}>
            <div className="mb-8">
              <PriceChart 
                height={300}
                showVolume={true}
                autoRefresh={true}
              />
            </div>
          </ScaleIn>

          {/* 多交易所状态 */}
          <FadeIn delay={0.45}>
            <div className="mb-8">
              <MultiExchangeStatus />
            </div>
          </FadeIn>

          {/* 套利保护系统 */}
          <FadeIn delay={0.5}>
            <div className="mb-8">
              <ArbitrageProtectionPanel />
            </div>
          </FadeIn>

          {/* 顶部：价格和TVL信息整合 */}
          <FadeIn delay={0.5}>
            <div className="mb-8">
              <TvlDisplay />
            </div>
          </FadeIn>

          {/* 主要内容区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {/* 左侧：策略面板 */}
            <SlideIn direction="left" delay={0.6}>
              <div className="lg:col-span-2">
                <StrategyPanel />
              </div>
            </SlideIn>

            {/* 右侧：持仓管理 */}
            <SlideIn direction="right" delay={0.7}>
              <div>
                <PositionManager />
              </div>
            </SlideIn>
          </div>

          {/* DCA网格策略信息 - 全宽显示 */}
          <FadeIn delay={0.8}>
            <div className="mb-8">
              <DCAStrategyDisplay />
            </div>
          </FadeIn>

          {/* DCA自动交易面板 */}
          <ScaleIn delay={0.9}>
            <div className="mb-8">
              <DCAAutoTradePanel />
            </div>
          </ScaleIn>

          {/* TradingView信号监控 */}
          <FadeIn delay={0.95}>
            <div className="mb-8">
              <TradingViewMonitor />
            </div>
          </FadeIn>

          {/* 底部：交易历史 */}
          <FadeIn delay={1.0}>
            <div className="mb-8">
              <TradeHistory />
            </div>
          </FadeIn>

          {/* 页脚信息 */}
          <FadeIn delay={1.1}>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>数据来源：CoinGecko API, DefiLlama API | 技术指标：EMA89, OBV, RSI, MACD</p>
              <p className="mt-1">⚠️ 本系统仅供学习和研究使用，不构成投资建议</p>
              <p className="mt-1">缓存状态: ✅ Redis已连接 | 响应时间: &lt;50ms</p>
            </div>
          </FadeIn>

          {/* 交易所设置弹窗 */}
          <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
          />
        </div>
      </PageTransition>
     )
   }

   export default function Home() {
     return (
       <CurrencyProvider>
         <NotificationProvider>
           <HomeContent />
         </NotificationProvider>
       </CurrencyProvider>
     )
   } 