'use client'

import { useState, useEffect } from 'react'
import { Target, Shield, Zap, Grid, Settings, Save } from 'lucide-react'

interface DCAStrategyConfig {
  type: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  pricePosition: number;
  maxOrders: number;
  initialAmount: number;
  orderAmount: number;
  priceDeviation: number;
  takeProfit: number;
  stopLoss?: number;
  amountMultiplier: number;
  deviationMultiplier: number;
  totalInvestment: number;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface StrategyData {
  dcaStrategy?: DCAStrategyConfig;
  pricePosition?: number;
  historicalHigh?: number;
  historicalLow?: number;
  timestamp: string;
  isMock?: boolean;
}

export default function DCAStrategyDisplay() {
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistoricalPriceSettings, setShowHistoricalPriceSettings] = useState(false)
  const [manualHistoricalHigh, setManualHistoricalHigh] = useState<string>('')
  const [manualHistoricalLow, setManualHistoricalLow] = useState<string>('')
  const [customHistoricalPrices, setCustomHistoricalPrices] = useState<{high: number, low: number} | null>(null)

  // 从本地存储加载自定义设置
  const loadCustomSettings = () => {
    try {
      const savedHP = localStorage.getItem('customHistoricalPrices')
      if (savedHP) {
        const parsed = JSON.parse(savedHP)
        setCustomHistoricalPrices(parsed)
        setManualHistoricalHigh(parsed.high.toString())
        setManualHistoricalLow(parsed.low.toString())
      }
    } catch (error) {
      console.error('加载自定义设置失败:', error)
    }
  }

  // 保存自定义设置到本地存储
  const saveCustomSettings = (data: any) => {
    try {
      localStorage.setItem('customHistoricalPrices', JSON.stringify(data))
      console.log('已保存历史高低价:', data)
    } catch (error) {
      console.error('保存历史高低价失败:', error)
    }
  }

  // 获取策略数据
  const fetchStrategy = async () => {
    try {
      setLoading(true)
      
      let url = '/api/strategy'
      const params = new URLSearchParams()
      
      if (customHistoricalPrices) {
        params.append('historicalHigh', customHistoricalPrices.high.toString())
        params.append('historicalLow', customHistoricalPrices.low.toString())
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      setStrategyData(data)
      
      if (data.historicalHigh > 0 && manualHistoricalHigh === '') {
        setManualHistoricalHigh(data.historicalHigh.toString())
      }
      if (data.historicalLow > 0 && manualHistoricalLow === '') {
        setManualHistoricalLow(data.historicalLow.toString())
      }
      
      setLoading(false)
    } catch (error) {
      console.error('获取策略数据失败:', error)
      setLoading(false)
    }
  }

  // 保存历史高低价设置
  const saveHistoricalPrices = async () => {
    const high = parseFloat(manualHistoricalHigh)
    const low = parseFloat(manualHistoricalLow)
    
    if (high > 0 && low > 0 && high > low) {
      saveCustomSettings({ high, low })
      setCustomHistoricalPrices({ high, low })
      await fetchStrategy()
      setShowHistoricalPriceSettings(false)
    } else {
      alert('请输入有效的历史高低价：最高价 > 最低价')
    }
  }

  // 清除自定义设置
  const clearCustomSettings = async () => {
    try {
      localStorage.removeItem('customHistoricalPrices')
      setCustomHistoricalPrices(null)
      setManualHistoricalHigh('')
      setManualHistoricalLow('')
      console.log('已清除历史高低价设置')
      await fetchStrategy()
    } catch (error) {
      console.error('清除历史高低价失败:', error)
    }
  }

  // 获取DCA策略颜色
  const getDCAStrategyColor = (type: string) => {
    switch (type) {
      case 'CONSERVATIVE':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'BALANCED':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'AGGRESSIVE':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  // 获取DCA策略图标
  const getDCAStrategyIcon = (type: string) => {
    switch (type) {
      case 'CONSERVATIVE':
        return <Shield className="w-4 h-4" />
      case 'BALANCED':
        return <Target className="w-4 h-4" />
      case 'AGGRESSIVE':
        return <Zap className="w-4 h-4" />
      default:
        return <Grid className="w-4 h-4" />
    }
  }

  // 格式化货币
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // 初始化
  useEffect(() => {
    loadCustomSettings()
    fetchStrategy()
    const interval = setInterval(fetchStrategy, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !strategyData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500">加载DCA策略数据...</div>
      </div>
    )
  }

  if (!strategyData?.dcaStrategy) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500">暂无DCA策略数据</div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DCA网格策略</h2>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 text-sm bg-white bg-opacity-50 rounded-full border">
            {strategyData.dcaStrategy.type === 'CONSERVATIVE' ? '保守型' :
             strategyData.dcaStrategy.type === 'BALANCED' ? '平衡型' : '激进型'}
          </span>
          <button
            onClick={() => setShowHistoricalPriceSettings(!showHistoricalPriceSettings)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <Settings className="w-4 h-4 mr-1" />
            设置
          </button>
        </div>
      </div>

      <div className={`p-6 rounded-lg border ${getDCAStrategyColor(strategyData.dcaStrategy.type)}`}>
        <div className="flex items-center mb-4">
          {getDCAStrategyIcon(strategyData.dcaStrategy.type)}
          <span className="ml-2 text-lg font-semibold">策略配置</span>
        </div>
        
        {/* 主要策略参数 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <div className="text-sm text-gray-600">价格位置</div>
            <div className="text-xl font-bold text-blue-600">{strategyData.pricePosition?.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">总投入</div>
            <div className="text-xl font-bold text-green-600">${strategyData.dcaStrategy.totalInvestment}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">最大订单数</div>
            <div className="text-xl font-bold text-purple-600">{strategyData.dcaStrategy.maxOrders}次</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">首单金额</div>
            <div className="text-xl font-bold text-orange-600">${strategyData.dcaStrategy.initialAmount}</div>
          </div>
        </div>
        
        {/* 详细策略参数 */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-6 p-4 bg-white bg-opacity-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600 mb-1">价格偏差</div>
            <div className="text-lg font-semibold text-blue-600">{strategyData.dcaStrategy.priceDeviation.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">止盈比例</div>
            <div className="text-lg font-semibold text-green-600">{strategyData.dcaStrategy.takeProfit.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">整体止损</div>
            <div className="text-lg font-semibold text-red-600">
              {strategyData.dcaStrategy.stopLoss ? `${strategyData.dcaStrategy.stopLoss}%` : '无'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">金额乘数</div>
            <div className="text-lg font-semibold text-purple-600">{strategyData.dcaStrategy.amountMultiplier}x</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">偏差乘数</div>
            <div className="text-lg font-semibold text-orange-600">{strategyData.dcaStrategy.deviationMultiplier}x</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">策略风险</div>
            <div className={`text-lg font-semibold ${
              strategyData.dcaStrategy.riskLevel === 'HIGH' ? 'text-red-600' :
              strategyData.dcaStrategy.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {strategyData.dcaStrategy.riskLevel === 'HIGH' ? '高风险' :
               strategyData.dcaStrategy.riskLevel === 'MEDIUM' ? '中等风险' : '低风险'}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          {strategyData.dcaStrategy.description}
        </div>
        
        {/* 历史高低价显示 */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-gray-600">历史最高价</div>
            <div className="text-lg font-semibold">{formatCurrency(strategyData.historicalHigh || 0)}</div>
          </div>
          <div>
            <div className="text-gray-600">历史最低价</div>
            <div className="text-lg font-semibold">{formatCurrency(strategyData.historicalLow || 0)}</div>
          </div>
        </div>
        
        {/* 历史高低价设置 */}
        {showHistoricalPriceSettings && (
          <div className="mt-6 p-4 bg-white rounded-lg border">
            <h4 className="text-lg font-medium mb-4">历史价格设置</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">历史最高价</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualHistoricalHigh}
                  onChange={(e) => setManualHistoricalHigh(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入历史最高价"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">历史最低价</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualHistoricalLow}
                  onChange={(e) => setManualHistoricalLow(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入历史最低价"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-500">
                💡 建议使用90天内的历史高低价，用于计算价格位置和DCA策略
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={saveHistoricalPrices}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </button>
                <button
                  onClick={() => setShowHistoricalPriceSettings(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                {customHistoricalPrices && (
                  <button
                    onClick={clearCustomSettings}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    清除设置
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 