'use client'

import { useState, useEffect } from 'react'
import { Play, Square, RefreshCw, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface DCASettings {
  symbol: string
  is_active: boolean
  amount: number
  max_orders: number
  price_deviation: number
  take_profit: number
  stop_loss: number
  current_order: number
  total_invested: number
  last_check: string
}

interface MarketData {
  currentPrice: number
  ema89: number
  priceBelowEma: boolean
  priceDistance: string
  lastUpdate: string
}

interface MultiplierData {
  value: number
  analysis: string
}

interface BalanceInfo {
  requiredAmount: string
  availableBalance: string
  balanceDetails: Array<{
    orderNumber: number
    amount: number
    cumulativeAmount: number
  }>
}

interface GridDetail {
  orderNumber: number
  amount: number
  targetPrice: number
  priceDeviation: number
  cumulativeAmount: number
  status: string
  executed: boolean
  current: boolean
}

export default function DCAAutoTradePanel() {
  const [dcaSettings, setDcaSettings] = useState<DCASettings | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [multiplierData, setMultiplierData] = useState<MultiplierData | null>(null)
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null)
  const [gridDetails, setGridDetails] = useState<GridDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showGridDetails, setShowGridDetails] = useState(false)
  const [settings, setSettings] = useState({
    symbol: 'SOLUSDT',
    amount: 80,
    maxOrders: 6,
    priceDeviation: 1.5,
    takeProfit: 1.2,
    stopLoss: 5.0
  })

  // 计算预计总投入
  const calculateExpectedTotal = () => {
    if (!dcaSettings) return 0
    
    let totalExpected = 0
    for (let i = 0; i < dcaSettings.max_orders; i++) {
      totalExpected += dcaSettings.amount * Math.pow(1.5, i)
    }
    return totalExpected
  }

  // 检查余额是否充足
  const checkBalanceSufficient = () => {
    if (!balanceInfo) return true
    const required = parseFloat(balanceInfo.requiredAmount)
    const available = parseFloat(balanceInfo.availableBalance)
    return available >= required
  }

  // 获取DCA状态
  const fetchDCAStatus = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/dca-auto-trade?symbol=${settings.symbol}`)
      const data = await response.json()
      
      if (response.ok) {
        setDcaSettings(data.dcaSettings)
        setMarketData(data.marketData)
        setMultiplierData(data.multiplier)
        setGridDetails(data.gridDetails || [])
        
        // 同步前端设置与数据库设置
        if (data.dcaSettings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            amount: data.dcaSettings.amount,
            maxOrders: data.dcaSettings.max_orders,
            priceDeviation: data.dcaSettings.price_deviation,
            takeProfit: data.dcaSettings.take_profit,
            stopLoss: data.dcaSettings.stop_loss
          }))
        }
      } else {
        setError(data.error || '获取DCA状态失败')
      }
    } catch (error) {
      console.error('获取DCA状态失败:', error)
      setError('获取DCA状态失败')
    } finally {
      setLoading(false)
    }
  }

  // 启动DCA交易
  const startDCATrading = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 先获取数据库中的最新设置
      const statusResponse = await fetch(`/api/dca-auto-trade?symbol=${settings.symbol}`)
      const statusData = await statusResponse.json()
      
      let dcaSettings = null
      if (statusResponse.ok && statusData.success && statusData.dcaSettings) {
        dcaSettings = statusData.dcaSettings
        console.log('使用数据库设置启动DCA:', dcaSettings)
      } else {
        console.log('使用前端设置启动DCA:', settings)
        dcaSettings = settings
      }
      
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'START',
          symbol: dcaSettings.symbol,
          amount: dcaSettings.amount,
          maxOrders: dcaSettings.max_orders || dcaSettings.maxOrders,
          priceDeviation: dcaSettings.price_deviation || dcaSettings.priceDeviation,
          takeProfit: dcaSettings.take_profit || dcaSettings.takeProfit,
          stopLoss: dcaSettings.stop_loss || dcaSettings.stopLoss
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setBalanceInfo(result.balanceInfo)
        await fetchDCAStatus()
        alert(`DCA自动交易已启动！\n\n预计总投入: $${result.balanceInfo.requiredAmount}\n可用余额: $${result.balanceInfo.availableBalance}\n\n请确保账户有足够余额完成所有订单。`)
      } else {
        if (result.details) {
          const shortage = parseFloat(result.details.shortage)
          const required = parseFloat(result.details.requiredAmount)
          const available = parseFloat(result.details.availableBalance)
          
          setError(`余额不足，无法启动DCA交易！\n\n` +
            `预计总投入: $${result.details.requiredAmount}\n` +
            `可用余额: $${result.details.availableBalance}\n` +
            `差额: $${result.details.shortage}\n\n` +
            `建议操作:\n` +
            `1. 充值至少 $${shortage.toFixed(2)} USDT\n` +
            `2. 或调整交易参数（降低基础金额/减少订单数）\n` +
            `3. 或使用小额配置进行测试`)
        } else {
          setError(result.error || '启动DCA交易失败')
        }
      }
    } catch (error) {
      console.error('启动DCA交易失败:', error)
      setError('启动DCA交易失败')
    } finally {
      setLoading(false)
    }
  }

  // 停止DCA交易
  const stopDCATrading = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'STOP',
          symbol: settings.symbol
        }),
      })

      const result = await response.json()

      if (response.ok) {
        await fetchDCAStatus()
        alert('DCA自动交易已停止！')
      } else {
        setError(result.error || '停止DCA交易失败')
      }
    } catch (error) {
      console.error('停止DCA交易失败:', error)
      setError('停止DCA交易失败')
    } finally {
      setLoading(false)
    }
  }

  // 手动执行DCA交易
  const executeDCATrade = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXECUTE',
          symbol: settings.symbol
        }),
      })

      const result = await response.json()

      if (response.ok) {
        await fetchDCAStatus()
        alert(`DCA交易执行成功！${result.message}`)
      } else {
        setError(result.error || '执行DCA交易失败')
      }
    } catch (error) {
      console.error('执行DCA交易失败:', error)
      setError('执行DCA交易失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存设置
  const saveSettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 保存设置到数据库
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          symbol: settings.symbol,
          amount: settings.amount,
          maxOrders: settings.maxOrders,
          priceDeviation: settings.priceDeviation,
          takeProfit: settings.takeProfit,
          stopLoss: settings.stopLoss
        }),
      })

      const result = await response.json()

      if (response.ok) {
    setShowSettings(false)
        await fetchDCAStatus() // 刷新状态
        alert('DCA设置已保存到数据库！')
      } else {
        setError(result.error || '保存设置失败')
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      setError('保存设置失败')
    } finally {
      setLoading(false)
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

  // 格式化百分比
  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // 初始化
  useEffect(() => {
    fetchDCAStatus()
    
    // 每30秒更新一次状态
    const interval = setInterval(fetchDCAStatus, 30000)
    return () => clearInterval(interval)
  }, [settings.symbol])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">DCA自动交易</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDCAStatus}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">DCA交易设置</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                交易对
              </label>
              <select
                value={settings.symbol}
                onChange={(e) => setSettings({...settings, symbol: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="BTCUSDT">BTC/USDT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                基础订单金额 (USDT)
              </label>
              <input
                type="number"
                value={settings.amount}
                onChange={(e) => setSettings({...settings, amount: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="10"
                step="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大订单数
              </label>
              <input
                type="number"
                value={settings.maxOrders}
                onChange={(e) => setSettings({...settings, maxOrders: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                止盈百分比 (%)
              </label>
              <input
                type="number"
                value={settings.takeProfit}
                onChange={(e) => setSettings({...settings, takeProfit: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0.1"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                止损百分比 (%)
              </label>
              <input
                type="number"
                value={settings.stopLoss}
                onChange={(e) => setSettings({...settings, stopLoss: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                价格偏差 (%)
              </label>
              <input
                type="number"
                value={settings.priceDeviation}
                onChange={(e) => setSettings({...settings, priceDeviation: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0.5"
                step="0.1"
              />
            </div>
          </div>
          <div className="flex space-x-2 mt-4">
            <button
              onClick={saveSettings}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              保存设置
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">操作失败</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 市场数据 */}
      {marketData && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium mb-3">30分钟图表 - EMA89分析</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">当前价格</div>
              <div className="text-lg font-semibold">{formatCurrency(marketData.currentPrice)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">EMA89</div>
              <div className="text-lg font-semibold">{formatCurrency(marketData.ema89)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">价格距离EMA89</div>
              <div className={`text-lg font-semibold ${
                parseFloat(marketData.priceDistance) < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatPercentage(parseFloat(marketData.priceDistance))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">交易条件</div>
              <div className="flex items-center">
                {marketData.priceBelowEma ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2" />
                )}
                <span className={marketData.priceBelowEma ? 'text-green-600' : 'text-red-600'}>
                  {marketData.priceBelowEma ? '满足买入条件' : '不满足买入条件'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 动态加仓幅度 */}
          {multiplierData && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-md font-medium text-green-800 mb-2">动态加仓幅度</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">当前加仓倍数</div>
                  <div className="text-lg font-semibold text-green-600">
                    {multiplierData.value.toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">策略类型</div>
                  <div className="text-sm font-medium">
                    {multiplierData.value < 1.3 ? '保守型' : 
                     multiplierData.value > 1.8 ? '激进型' : '平衡型'}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                {multiplierData.analysis}
              </div>
            </div>
          )}
          
          <div className="mt-3 text-xs text-gray-500">
            最后更新: {new Date(marketData.lastUpdate).toLocaleString()}
          </div>
        </div>
      )}

      {/* DCA状态 */}
      {dcaSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-3">DCA交易状态</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">交易状态</div>
              <div className="flex items-center">
                {dcaSettings.is_active ? (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-600 font-medium">运行中</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-gray-600 font-medium">已停止</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">进度</div>
              <div className="text-lg font-semibold">
                {dcaSettings.current_order} / {dcaSettings.max_orders}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">已投入</div>
              <div className="text-lg font-semibold text-blue-600">{formatCurrency(dcaSettings.total_invested)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">预计总投入</div>
              <div className="text-lg font-semibold text-purple-600">{formatCurrency(calculateExpectedTotal())}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">基础金额</div>
              <div className="text-lg font-semibold">{formatCurrency(dcaSettings.amount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">剩余投入</div>
              <div className="text-lg font-semibold text-orange-600">
                {formatCurrency(calculateExpectedTotal() - dcaSettings.total_invested)}
              </div>
            </div>
          </div>
          
          {/* 当前价格信息 */}
          {marketData && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">当前价格</div>
                  <div className="text-lg font-semibold text-blue-600">${marketData.currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">EMA89</div>
                  <div className="text-lg font-semibold">${marketData.ema89.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">价格位置</div>
                  <div className={`text-lg font-semibold ${marketData.priceBelowEma ? 'text-red-600' : 'text-green-600'}`}>
                    {marketData.priceDistance}%
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 网格详情按钮 */}
          <div className="mt-4">
            <button
              onClick={() => setShowGridDetails(!showGridDetails)}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {showGridDetails ? '隐藏网格详情' : '显示网格详情'}
              <svg className={`ml-2 w-4 h-4 transition-transform ${showGridDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* 网格详情 */}
          {showGridDetails && gridDetails.length > 0 && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-md font-medium text-gray-800 mb-3">DCA网格详情</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gridDetails.map((grid) => (
                  <div 
                    key={grid.orderNumber}
                    className={`p-3 rounded-lg border ${
                      grid.current 
                        ? 'bg-blue-50 border-blue-300' 
                        : grid.executed 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-gray-700">
                        第{grid.orderNumber}单
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        grid.current 
                          ? 'bg-blue-100 text-blue-700' 
                          : grid.executed 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {grid.status}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">投入金额:</span>
                        <span className="font-medium">${grid.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">目标价格:</span>
                        <span className="font-medium">${grid.targetPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">价格偏差:</span>
                        <span className="font-medium">{grid.priceDeviation.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">累计投入:</span>
                        <span className="font-medium">${grid.cumulativeAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 余额风险提示 */}
          {balanceInfo && !checkBalanceSufficient() && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">余额不足风险</h4>
                  <div className="mt-1 text-sm text-red-700">
                    <p>当前余额不足以完成所有DCA订单，建议充值或调整交易参数。</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium">需要金额:</span> ${balanceInfo.requiredAmount}
                      </div>
                      <div>
                        <span className="font-medium">可用余额:</span> ${balanceInfo.availableBalance}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">差额:</span> ${(parseFloat(balanceInfo.requiredAmount) - parseFloat(balanceInfo.availableBalance)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 余额信息 */}
          {balanceInfo && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-md font-medium text-blue-800 mb-2">余额信息</h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-600">预计总投入</div>
                  <div className="text-lg font-semibold text-blue-600">${balanceInfo.requiredAmount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">可用余额</div>
                  <div className={`text-lg font-semibold ${checkBalanceSufficient() ? 'text-green-600' : 'text-red-600'}`}>
                    ${balanceInfo.availableBalance}
                  </div>
                </div>
              </div>
              
              {/* 订单详情 */}
              <div className="text-sm text-gray-700">
                <div className="font-medium mb-2">订单金额详情:</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {balanceInfo.balanceDetails.map((detail, index) => (
                    <div key={index} className="bg-white p-2 rounded border">
                      <div className="font-medium">第{detail.orderNumber}单</div>
                      <div className="text-gray-600">${detail.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 进度条 */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>交易进度</span>
              <span>{Math.round((dcaSettings.current_order / dcaSettings.max_orders) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(dcaSettings.current_order / dcaSettings.max_orders) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex space-x-3">
        {!dcaSettings?.is_active ? (
          <button
            onClick={startDCATrading}
            disabled={loading}
            className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? '启动中...' : '启动DCA交易'}
          </button>
        ) : (
          <button
            onClick={stopDCATrading}
            disabled={loading}
            className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="w-4 h-4 mr-2" />
            {loading ? '停止中...' : '停止DCA交易'}
          </button>
        )}
        
        <button
          onClick={executeDCATrade}
          disabled={loading || !dcaSettings?.is_active || !marketData?.priceBelowEma}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading ? '执行中...' : '手动执行'}
        </button>
      </div>

      {/* 说明信息 */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">DCA交易说明</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>基于30分钟图表和EMA89线进行自动交易</li>
                <li>当价格跌破EMA89线时自动买入</li>
                <li>订单金额按1.5倍递增（首单80USDT，第二单120USDT...）</li>
                <li>最多执行6次买入订单</li>
                <li>请确保账户有足够的USDT余额</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 