'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, BarChart3, Brain, Activity, RefreshCw, AlertTriangle, Info, Settings, Save, DollarSign, Percent, Layers, Target, Shield } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

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
  emaScore: number
  obvScore: number
  rsiScore: number
  macdScore: number
  totalScore: number
  recommendation: string
  confidence: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskScore: number
  riskFactors: string[]
  trend: string
  support: number
  resistance: number
  volatility: number
  current_price: number
  timestamp: string
  isMock?: boolean
  dcaStrategy?: DCAStrategyConfig
  pricePosition?: number
  historicalHigh?: number
  historicalLow?: number
  indicators?: {
    ema89: {
      value: number
      period: number
      description: string
    }
    rsi: {
      value: number
      period: number
      description: string
    }
    obv: {
      value: number
      description: string
    }
    macd: {
      value: number
      signal: number
      fastPeriod: number
      slowPeriod: number
      signalPeriod: number
      description: string
    }
  }
  detailedAnalysis?: {
    emaAnalysis: string
    obvAnalysis: string
    rsiAnalysis: string
    macdAnalysis: string
    trendAnalysis: string
    riskAnalysis: string
    dcaAnalysis?: string
  }
}

export default function StrategyPanel() {
  const { currentSymbol } = useCurrency()
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [showSupportResistanceSettings, setShowSupportResistanceSettings] = useState(false)
  const [showHistoricalPriceSettings, setShowHistoricalPriceSettings] = useState(false)
  const [manualSupport, setManualSupport] = useState<string>('')
  const [manualResistance, setManualResistance] = useState<string>('')
  const [manualHistoricalHigh, setManualHistoricalHigh] = useState<string>('')
  const [manualHistoricalLow, setManualHistoricalLow] = useState<string>('')
  const [customSupportResistance, setCustomSupportResistance] = useState<{support: number, resistance: number} | null>(null)
  const [customHistoricalPrices, setCustomHistoricalPrices] = useState<{high: number, low: number} | null>(null)

  // 从本地存储加载自定义设置
  const loadCustomSettings = () => {
    try {
      // 加载支撑阻力位
      const savedSR = localStorage.getItem('customSupportResistance')
      if (savedSR) {
        const parsed = JSON.parse(savedSR)
        setCustomSupportResistance(parsed)
        setManualSupport(parsed.support.toString())
        setManualResistance(parsed.resistance.toString())
      }
      
      // 加载历史高低价
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
  const saveCustomSettings = (type: 'supportResistance' | 'historicalPrices', data: any) => {
    try {
      const key = type === 'supportResistance' ? 'customSupportResistance' : 'customHistoricalPrices'
      localStorage.setItem(key, JSON.stringify(data))
      console.log(`已保存${type === 'supportResistance' ? '支撑阻力位' : '历史高低价'}:`, data)
    } catch (error) {
      console.error(`保存${type === 'supportResistance' ? '支撑阻力位' : '历史高低价'}失败:`, error)
    }
  }

  // 清除自定义设置
  const clearCustomSettings = async (type: 'supportResistance' | 'historicalPrices') => {
    try {
      const key = type === 'supportResistance' ? 'customSupportResistance' : 'customHistoricalPrices'
      localStorage.removeItem(key)
      
      if (type === 'supportResistance') {
        setCustomSupportResistance(null)
        setManualSupport('')
        setManualResistance('')
      } else {
        setCustomHistoricalPrices(null)
        setManualHistoricalHigh('')
        setManualHistoricalLow('')
      }
      
      console.log(`已清除${type === 'supportResistance' ? '支撑阻力位' : '历史高低价'}设置`)
      
      // 重新获取策略数据
      await fetchStrategy()
    } catch (error) {
      console.error(`清除${type === 'supportResistance' ? '支撑阻力位' : '历史高低价'}失败:`, error)
    }
  }

  // 获取策略数据
  const fetchStrategy = async () => {
    try {
      setLoading(true)
      
      // 构建请求URL，包含所有参数
      const params = new URLSearchParams()
      params.append('symbol', currentSymbol)
      
      // 添加支撑阻力位参数
      if (customSupportResistance) {
        params.append('customSupport', customSupportResistance.support.toString())
        params.append('customResistance', customSupportResistance.resistance.toString())
      }
      
      // 添加历史高低价参数
      if (customHistoricalPrices) {
        params.append('historicalHigh', customHistoricalPrices.high.toString())
        params.append('historicalLow', customHistoricalPrices.low.toString())
      }
      
      const url = `/api/strategy?${params.toString()}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      // 调试信息
      console.log('获取到的策略数据:', data)
      console.log('DCA策略:', data.dcaStrategy)
      console.log('价格位置:', data.pricePosition)
      console.log('风险因素:', data.riskFactors)
      console.log('是否为模拟数据:', data.isMock)
      
      setStrategyData(data)
      
      // 初始化手动设置的值
      if (data.support > 0 && manualSupport === '') {
        setManualSupport(data.support.toString())
      }
      if (data.resistance > 0 && manualResistance === '') {
        setManualResistance(data.resistance.toString())
      }
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

  // 保存支撑阻力位设置
  const saveSupportResistance = async () => {
    const support = parseFloat(manualSupport)
    const resistance = parseFloat(manualResistance)
    
    if (support > 0 && resistance > 0 && support < resistance) {
      // 保存到本地存储
      saveCustomSettings('supportResistance', { support, resistance })
      setCustomSupportResistance({ support, resistance })
      
      // 重新获取策略数据以更新风险评分
      await fetchStrategy()
      
      setShowSupportResistanceSettings(false)
    } else {
      alert('请输入有效的支撑阻力位：支撑位 < 阻力位')
    }
  }

  // 保存历史高低价设置
  const saveHistoricalPrices = async () => {
    const high = parseFloat(manualHistoricalHigh)
    const low = parseFloat(manualHistoricalLow)
    
    if (high > 0 && low > 0 && high > low) {
      // 保存到本地存储
      saveCustomSettings('historicalPrices', { high, low })
      setCustomHistoricalPrices({ high, low })
      
      // 重新获取策略数据以更新DCA策略
      await fetchStrategy()
      
      setShowHistoricalPriceSettings(false)
    } else {
      alert('请输入有效的历史高低价：最高价 > 最低价')
    }
  }

  // 自动刷新策略数据（每60秒）
  useEffect(() => {
    // 初始化时加载自定义设置
    loadCustomSettings()
    fetchStrategy()
    const interval = setInterval(fetchStrategy, 60000)
    return () => clearInterval(interval)
  }, [currentSymbol]) // 添加currentSymbol依赖

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
      case 'STRONG_BUY':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'BUY':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'STRONG_SELL':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'SELL':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
      case 'BUY':
        return <TrendingUp className="w-5 h-5" />
      case 'STRONG_SELL':
      case 'SELL':
        return <TrendingDown className="w-5 h-5" />
      default:
        return <Minus className="w-5 h-5" />
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'text-green-600 bg-green-100'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100'
      case 'HIGH':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return <Shield className="w-4 h-4" />
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4" />
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">策略评分</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            {showDetails ? '隐藏详情' : '显示详情'}
          </button>
          <button
            onClick={fetchStrategy}
            disabled={loading}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* 总评分和置信度 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700">
            <span className={`text-2xl font-bold ${getScoreColor(strategyData.totalScore)}`}>
              {strategyData.totalScore}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">综合评分</p>
          <div className="mt-2 text-xs text-gray-500">
            置信度: {strategyData.confidence}%
          </div>
        </div>



        {/* 建议和风险等级 */}
        <div className="space-y-3">
          <div className={`p-4 rounded-lg border ${getRecommendationColor(strategyData.recommendation)}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">建议操作</span>
              {getRecommendationIcon(strategyData.recommendation)}
            </div>
            <p className="mt-1 text-lg font-bold">{strategyData.recommendation}</p>
          </div>

          <div className={`p-3 rounded-lg border ${getRiskLevelColor(strategyData.riskLevel)}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">风险等级</span>
              <div className="flex items-center space-x-2">
                {getRiskLevelIcon(strategyData.riskLevel)}
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                  strategyData.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                  strategyData.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {strategyData.riskLevel === 'HIGH' ? '高风险' :
                   strategyData.riskLevel === 'MEDIUM' ? '中等风险' : '低风险'}
                </div>
              </div>
            </div>
            <p className="mt-1 text-sm font-bold">{strategyData.riskLevel}</p>
            <div className="mt-2 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">风险评分:</span>
                <span className={`font-bold ${
                  (strategyData.riskScore || 0) >= 50 ? 'text-red-600' : 
                  (strategyData.riskScore || 0) >= 26 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {Math.round(strategyData.riskScore || 0)}/100
                </span>
              </div>
              
              {/* 风险评分进度条 */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2 relative">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    (strategyData.riskScore || 0) >= 50 ? 'bg-red-500' : 
                    (strategyData.riskScore || 0) >= 26 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(strategyData.riskScore || 0, 100)}%` }}
                ></div>
                {/* 显示评分数值 - 优化显示效果 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-white bg-black bg-opacity-80 px-1.5 py-0.5 rounded shadow-lg z-10 min-w-[20px] text-center">
                    {Math.round(strategyData.riskScore || 0)}
                  </span>
                </div>
              </div>
              
              {/* 风险等级指示器 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-500 text-xs font-medium">低 (0-25)</span>
                <span className="text-yellow-500 text-xs font-medium">中 (26-49)</span>
                <span className="text-red-500 text-xs font-medium">高 (50-100)</span>
              </div>
              
              {strategyData.riskFactors && strategyData.riskFactors.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-600 mb-1 font-medium">风险因素:</div>
                  <div className="space-y-1">
                    {strategyData.riskFactors.map((factor, index) => (
                      <div key={index} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs border-l-2 border-red-400">
                        ⚠️ {factor}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 风险评分说明 - 隐藏提示 */}
              <div className="relative group">
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs cursor-help">
                  <div className="text-gray-600">
                    <span className="font-medium">评分说明:</span> 
                    {strategyData.riskScore >= 60 ? ' 高风险 - 建议谨慎操作，设置止损' :
                     strategyData.riskScore >= 40 ? ' 中等风险 - 正常操作，注意风险管理' :
                     ' 低风险 - 相对安全，可正常交易'}
                    <span className="ml-1 text-gray-400">ℹ️</span>
                  </div>
                </div>
                
                {/* 悬浮提示 */}
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="space-y-2">
                    <div className="font-medium text-green-400">风险评分详解:</div>
                    <div className="space-y-1 text-gray-300">
                      <div>• <span className="text-green-400">0-25分 (低风险)</span>: 市场相对稳定，可正常交易</div>
                      <div>• <span className="text-yellow-400">26-39分 (中低风险)</span>: 需注意风险管理</div>
                      <div>• <span className="text-yellow-500">40-49分 (中等风险)</span>: 正常操作，设置止损</div>
                      <div>• <span className="text-orange-400">50-69分 (中高风险)</span>: 谨慎操作，减少仓位</div>
                      <div>• <span className="text-red-400">70-100分 (高风险)</span>: 建议暂停交易，等待机会</div>
                    </div>
                    <div className="border-t border-gray-600 pt-2">
                      <div className="text-gray-300">
                        <span className="font-medium">当前评分: {Math.round(strategyData.riskScore || 0)}分</span>
                        <br />
                        {(strategyData.riskScore || 0) >= 50 ? '建议: 设置严格止损，考虑减仓' :
                         (strategyData.riskScore || 0) >= 26 ? '建议: 正常操作，注意风险控制' :
                         '建议: 相对安全，可正常交易'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 提示箭头 */}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 趋势和波动率 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">趋势</div>
            <div className="font-semibold text-blue-700">{strategyData.trend}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600">波动率</div>
            <div className="font-semibold text-purple-700">{strategyData.volatility}%</div>
          </div>
        </div>

        {/* 风险判定标准说明 - 隐藏提示 */}
        <div className="relative group">
          <div className="p-3 bg-gray-50 rounded-lg cursor-help">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">风险判定标准</div>
              <div className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* 悬浮提示 */}
          <div className="absolute bottom-full left-0 mb-2 w-96 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <div className="font-medium text-red-400">高风险触发条件:</div>
                <div className="text-gray-300">• 波动率 &gt; 8% (权重30%)</div>
                <div className="text-gray-300">• EMA偏离度 &gt; 12% (权重25%)</div>
                <div className="text-gray-300">• RSI &gt; 85 或 &lt; 15 (权重20%)</div>
                <div className="text-gray-300">• MACD背离 &gt; 0.03 (权重15%)</div>
                <div className="text-gray-300">• 接近支撑/阻力位 &lt; 2% (权重20%)</div>
                <div className="text-gray-300">• 突破支撑/阻力位 (权重25%)</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-green-400">低风险条件:</div>
                <div className="text-gray-300">• 波动率 &lt; 2%</div>
                <div className="text-gray-300">• EMA偏离度 &lt; 3%</div>
                <div className="text-gray-300">• RSI在40-60之间</div>
                <div className="text-gray-300">• 距离支撑/阻力位 &gt; 10%</div>
                <div className="text-gray-300">• 风险评分 ≤ 25</div>
              </div>
              <div className="border-t border-gray-600 pt-2">
                <div className="font-medium text-blue-400 mb-1">支撑压力位风险说明:</div>
                <div className="space-y-1 text-gray-300">
                  <div>• 接近支撑位: 距离 &lt; 2% (高风险) 或 &lt; 5% (中风险) 或 &lt; 10% (低风险)</div>
                  <div>• 接近阻力位: 距离 &lt; 2% (高风险) 或 &lt; 5% (中风险) 或 &lt; 10% (低风险)</div>
                  <div>• 跌破支撑位: 价格低于支撑位 (高风险)</div>
                  <div>• 突破阻力位: 价格高于阻力位 (高风险)</div>
                </div>
              </div>
            </div>
            
            {/* 提示箭头 */}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        {/* 支撑阻力位 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="text-sm text-gray-600">支撑阻力位</div>
              {customSupportResistance && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  自定义
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {customSupportResistance && (
                <button
                  onClick={() => clearCustomSettings('supportResistance')}
                  className="flex items-center text-xs text-red-500 hover:text-red-700"
                  title="清除自定义设置"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清除
                </button>
              )}
              <button
                onClick={() => setShowSupportResistanceSettings(!showSupportResistanceSettings)}
                className="flex items-center text-xs text-gray-500 hover:text-gray-700"
              >
                <Settings className="w-3 h-3 mr-1" />
                设置
              </button>
            </div>
          </div>
          
          {showSupportResistanceSettings ? (
            <div className="space-y-3 p-3 bg-white rounded border">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">支撑位</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualSupport}
                    onChange={(e) => setManualSupport(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="输入支撑位"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">阻力位</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualResistance}
                    onChange={(e) => setManualResistance(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="输入阻力位"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  💡 自定义支撑阻力位将保存到本地，下次启动时自动加载，并用于风险评分计算
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={saveSupportResistance}
                    className="flex items-center px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    保存
                  </button>
                  <button
                    onClick={() => setShowSupportResistanceSettings(false)}
                    className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-green-600">支撑位</div>
                <div className="font-semibold">{formatCurrency(strategyData.support)}</div>
              </div>
              <div>
                <div className="text-red-600">阻力位</div>
                <div className="font-semibold">{formatCurrency(strategyData.resistance)}</div>
              </div>
            </div>
          )}
        </div>

        {/* 各项指标评分 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">指标详情</h3>
          
          {/* EMA评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">EMA89</span>
                {strategyData.indicators?.ema89 && (
                  <div className="text-xs text-gray-500">
                    {strategyData.indicators.ema89.description} (周期: {strategyData.indicators.ema89.period})
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.emaScore}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${getScoreColor(strategyData.emaScore)}`}>
                  {strategyData.emaScore}
                </span>
                {strategyData.indicators?.ema89 && (
                  <div className="text-xs text-gray-500">
                    ${(strategyData.indicators.ema89.value || 0).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OBV评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">OBV</span>
                {strategyData.indicators?.obv && (
                  <div className="text-xs text-gray-500">
                    {strategyData.indicators.obv.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.obvScore}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${getScoreColor(strategyData.obvScore)}`}>
                  {strategyData.obvScore}
                </span>
                {strategyData.indicators?.obv && (
                  <div className="text-xs text-gray-500">
                    {strategyData.indicators.obv.value.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RSI评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">RSI</span>
                {strategyData.indicators?.rsi && (
                  <div className="text-xs text-gray-500">
                    {strategyData.indicators.rsi.description} (周期: {strategyData.indicators.rsi.period})
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.rsiScore}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${getScoreColor(strategyData.rsiScore)}`}>
                  {strategyData.rsiScore}
                </span>
                {strategyData.indicators?.rsi && (
                  <div className="text-xs text-gray-500">
                    {(strategyData.indicators.rsi.value || 0).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MACD评分 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">MACD</span>
                {strategyData.indicators?.macd && (
                  <div className="text-xs text-gray-500">
                    {strategyData.indicators.macd.description} ({strategyData.indicators.macd.fastPeriod}/{strategyData.indicators.macd.slowPeriod}/{strategyData.indicators.macd.signalPeriod})
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${strategyData.macdScore}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${getScoreColor(strategyData.macdScore)}`}>
                  {strategyData.macdScore}
                </span>
                {strategyData.indicators?.macd && (
                  <div className="text-xs text-gray-500">
                    {(strategyData.indicators.macd.value || 0).toFixed(4)} / {(strategyData.indicators.macd.signal || 0).toFixed(4)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 详细分析 */}
        {showDetails && strategyData.detailedAnalysis && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">详细分析</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-blue-600">EMA89分析</div>
                <div className="text-gray-600">{strategyData.detailedAnalysis.emaAnalysis}</div>
              </div>
              
              <div>
                <div className="font-medium text-green-600">OBV分析</div>
                <div className="text-gray-600">{strategyData.detailedAnalysis.obvAnalysis}</div>
              </div>
              
              <div>
                <div className="font-medium text-purple-600">RSI分析</div>
                <div className="text-gray-600">{strategyData.detailedAnalysis.rsiAnalysis}</div>
              </div>
              
              <div>
                <div className="font-medium text-orange-600">MACD分析</div>
                <div className="text-gray-600">{strategyData.detailedAnalysis.macdAnalysis}</div>
              </div>
              
              <div>
                <div className="font-medium text-indigo-600">趋势分析</div>
                <div className="text-gray-600">{strategyData.detailedAnalysis.trendAnalysis}</div>
              </div>
              
              <div>
                <div className="font-medium text-red-600">风险分析</div>
                <div className="text-gray-600">{strategyData.detailedAnalysis.riskAnalysis}</div>
              </div>
              
              {strategyData.detailedAnalysis.dcaAnalysis && (
                <div>
                  <div className="font-medium text-emerald-600">DCA策略分析</div>
                  <div className="text-gray-600">{strategyData.detailedAnalysis.dcaAnalysis}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 时间戳 */}
        <div className="text-xs text-gray-500 text-center">
          最后更新: {new Date(strategyData.timestamp).toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  )
} 