'use client'

import { useState, useEffect } from 'react'
import { Play, Square, RefreshCw, Settings, AlertTriangle, CheckCircle, XCircle, Trash2, History } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

interface TradeHistory {
  id: number
  symbol: string
  trade_type: string
  price: number
  quantity: number
  total_amount: number
  strategy_reason: string
  notes: string
  timestamp: string
}

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
  const { currentSymbol, setCurrentSymbol, availableSymbols, symbolCategory, setSymbolCategory } = useCurrency()
  const [dcaSettings, setDcaSettings] = useState<DCASettings | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [multiplierData, setMultiplierData] = useState<MultiplierData | null>(null)
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null)
  const [gridDetails, setGridDetails] = useState<GridDetail[]>([])
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showGridDetails, setShowGridDetails] = useState(false)
  const [showTradeHistory, setShowTradeHistory] = useState(false)
  const [profitData, setProfitData] = useState<any>(null)
  const [settings, setSettings] = useState({
    symbol: currentSymbol,
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
      
      console.log('DCA状态API响应:', data)
      
      if (response.ok) {
        console.log('设置DCA状态:', {
          dcaSettings: data.dcaSettings,
          marketData: data.marketData,
          multiplier: data.multiplier
        })
        
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

  // 获取交易历史
  const fetchTradeHistory = async () => {
    try {
      // 获取更多交易记录以确保包含所有DCA交易
      const response = await fetch(`/api/trades?symbol=${settings.symbol}&limit=50`)
      const data = await response.json()
      
      if (response.ok) {
        setTradeHistory(data.trades || [])
      } else {
        console.error('获取交易历史失败:', data.error)
      }
    } catch (error) {
      console.error('获取交易历史失败:', error)
    }
  }

  // 获取完整的交易历史（用于盈亏计算）
  const fetchCompleteTradeHistory = async () => {
    try {
      // 获取更多交易记录以确保包含所有历史交易
      const response = await fetch(`/api/trades?symbol=${settings.symbol}&limit=100`)
      const data = await response.json()
      
      if (response.ok) {
        return data.trades || []
      } else {
        console.error('获取完整交易历史失败:', data.error)
        return []
      }
    } catch (error) {
      console.error('获取完整交易历史失败:', error)
      return []
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
      // 显示平仓选择对话框
      const closePositions = confirm(
        `确定要停止DCA交易吗？\n\n` +
        `当前进度：${dcaSettings?.current_order || 0}/${dcaSettings?.max_orders || 0} 单\n` +
        `总投入：${formatCurrency(dcaSettings?.total_invested || 0)}\n\n` +
        `选择操作：\n` +
        `• 点击"确定"：停止DCA并平仓所有持仓\n` +
        `• 点击"取消"：仅停止DCA，保留持仓`
      )
      
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'STOP',
          symbol: settings.symbol,
          closePositions: closePositions
        }),
      })

      const result = await response.json()

      if (response.ok) {
        await fetchDCAStatus()
        
        // 显示详细的结果信息
        let message = 'DCA自动交易已停止！'
        if (closePositions) {
          if (result.closePositionsResult?.success) {
            message += `\n\n✅ 平仓成功：\n` +
              `• 平仓数量：${result.closePositionsResult.quantity} ${settings.symbol.replace('USDT', '')}\n` +
              `• 订单ID：${result.closePositionsResult.orderId}\n` +
              `• 状态：${result.closePositionsResult.status}`
          } else {
            message += `\n\n⚠️ 平仓结果：${result.closePositionsResult?.message || result.closePositionsResult?.error || '平仓失败'}`
          }
        } else {
          message += '\n\n📊 持仓已保留，您可以手动管理'
        }
        
        alert(message)
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

  // 重置DCA设置
  const resetDCASettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 确认重置
      const confirmMessage = `确定要完全重置DCA设置吗？\n\n⚠️ 警告：这将删除所有DCA配置和进度，无法恢复！\n\n当前进度：${dcaSettings?.current_order || 0}/${dcaSettings?.max_orders || 0} 单\n总投入：${formatCurrency(dcaSettings?.total_invested || 0)}`
      if (!confirm(confirmMessage)) {
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'RESET',
          symbol: settings.symbol
        }),
      })

      const result = await response.json()

      if (response.ok) {
        await fetchDCAStatus()
        alert('DCA设置已完全重置！')
      } else {
        setError(result.error || '重置DCA设置失败')
      }
    } catch (error) {
      console.error('重置DCA设置失败:', error)
      setError('重置DCA设置失败')
    } finally {
      setLoading(false)
    }
  }

  // 手动执行DCA交易
  const executeDCATrade = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 检查是否需要强制执行
      const forceExecute = !marketData?.priceBelowEma
      
      // 如果是强制执行，显示确认对话框
      if (forceExecute) {
        const confirmMessage = `当前价格 ($${marketData?.currentPrice?.toFixed(2)}) 未跌破EMA89 ($${marketData?.ema89?.toFixed(2)})，距离 +${marketData?.priceDistance}%\n\n确定要强制执行DCA交易吗？\n\n⚠️ 注意：这可能会在不利的价格条件下买入。`
        if (!confirm(confirmMessage)) {
          setLoading(false)
          return
        }
      }
      
      const response = await fetch('/api/dca-auto-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXECUTE',
          symbol: settings.symbol,
          forceExecute: forceExecute
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

  // 计算当前持仓盈亏
  const calculateProfitLoss = () => {
    if (!dcaSettings || !marketData?.currentPrice || !tradeHistory.length) {
      return { 
        profitLoss: 0, 
        profitLossPercent: 0, 
        totalQuantity: 0, 
        avgPrice: 0,
        tradeCount: 0,
        dataRange: '无数据'
      }
    }
    
    // 只计算买入交易，并按时间排序（最新的在前）
    const buyTrades = tradeHistory
      .filter((trade: TradeHistory) => trade.trade_type === 'BUY')
      .sort((a: TradeHistory, b: TradeHistory) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    if (buyTrades.length === 0) {
      return { 
        profitLoss: 0, 
        profitLossPercent: 0, 
        totalQuantity: 0, 
        avgPrice: 0,
        tradeCount: buyTrades.length,
        dataRange: '无买入记录'
      }
    }
    
    // 计算总投入和总数量
    let totalInvested = 0
    let totalQuantity = 0
    
    buyTrades.forEach((trade: TradeHistory) => {
      totalInvested += parseFloat(String(trade.total_amount || 0))
      totalQuantity += parseFloat(String(trade.quantity || 0))
    })
    
    if (totalQuantity === 0) {
      return { 
        profitLoss: 0, 
        profitLossPercent: 0, 
        totalQuantity: 0, 
        avgPrice: 0,
        tradeCount: buyTrades.length,
        dataRange: '数据异常'
      }
    }
    
    // 计算平均买入价格
    const avgPrice = totalInvested / totalQuantity
    
    // 计算当前价值和盈亏
    const currentValue = totalQuantity * marketData.currentPrice
    const profitLoss = currentValue - totalInvested
    const profitLossPercent = (profitLoss / totalInvested) * 100
    
    // 计算数据范围
    const firstTrade = buyTrades[buyTrades.length - 1] // 最早的交易
    const lastTrade = buyTrades[0] // 最新的交易
    const dataRange = `${buyTrades.length}笔买入交易 (${new Date(firstTrade.timestamp).toLocaleDateString()} - ${new Date(lastTrade.timestamp).toLocaleDateString()})`
    
    return {
      profitLoss,
      profitLossPercent,
      totalQuantity,
      avgPrice,
      tradeCount: buyTrades.length,
      dataRange
    }
  }

  // 更新盈亏数据
  const updateProfitData = () => {
    const data = calculateProfitLoss()
    setProfitData(data)
  }

  // 初始化
  useEffect(() => {
    fetchDCAStatus()
    fetchTradeHistory()
    
    // 每30秒更新一次状态
    const interval = setInterval(() => {
      fetchDCAStatus()
      fetchTradeHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [settings.symbol])

  // 当交易历史更新时，更新盈亏数据
  useEffect(() => {
    updateProfitData()
  }, [tradeHistory, marketData?.currentPrice])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">DCA自动交易</h2>
              <p className="text-blue-100 text-sm">智能定投策略管理</p>
              <div className="mt-1 text-xs text-blue-200">
                当前币种: {Array.isArray(availableSymbols) ? availableSymbols.find(s => s.symbol === currentSymbol)?.name || currentSymbol : currentSymbol}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDCAStatus}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              title="刷新状态"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">

        {/* 快速币种切换 */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-xs">🔄</span>
              </div>
              <h3 className="text-md font-semibold text-indigo-800">快速币种切换</h3>
            </div>
            <select
              value={symbolCategory}
              onChange={(e) => {
                const category = e.target.value
                setSymbolCategory(category)
              }}
              className="px-3 py-1 text-sm border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部币种</option>
              <option value="major">主要币种</option>
              <option value="defi">DeFi币种</option>
              <option value="gaming">游戏币种</option>
              <option value="layer1">Layer1币种</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(availableSymbols) ? availableSymbols.slice(0, 12).map((symbol) => (
              <button
                key={symbol.symbol}
                onClick={() => {
                  if (symbol.symbol !== currentSymbol) {
                    if (confirm(`确定要切换到 ${symbol.name} (${symbol.symbol}) 吗？\n\n⚠️ 注意：切换币种将重置当前DCA状态。`)) {
                      setCurrentSymbol(symbol.symbol)
                      setSettings({...settings, symbol: symbol.symbol})
                      setDcaSettings(null)
                      setMarketData(null)
                      setTradeHistory([])
                      setProfitData(null)
                    }
                  }
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  symbol.symbol === currentSymbol
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                }`}
              >
                {symbol.name}
              </button>
            )) : (
              <div className="text-gray-500 text-sm">加载中...</div>
            )}
          </div>
          <div className="mt-2 text-xs text-indigo-600">
            点击币种快速切换，当前分类: {symbolCategory === 'all' ? '全部币种' : 
              symbolCategory === 'major' ? '主要币种' :
              symbolCategory === 'defi' ? 'DeFi币种' :
              symbolCategory === 'gaming' ? '游戏币种' :
              symbolCategory === 'layer1' ? 'Layer1币种' : '全部币种'} 
            ({availableSymbols.length} 个交易对)
          </div>
        </div>

        {/* 设置面板 */}
      {showSettings && (
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">DCA交易设置</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                交易对
              </label>
              <select
                value={currentSymbol}
                onChange={(e) => {
                  const newSymbol = e.target.value
                  if (newSymbol !== currentSymbol) {
                    // 确认切换币种
                    if (confirm(`确定要切换到 ${newSymbol} 吗？\n\n⚠️ 注意：切换币种将重置当前DCA状态，需要重新启动交易。`)) {
                      setCurrentSymbol(newSymbol)
                      setSettings({...settings, symbol: newSymbol})
                      // 清空当前状态
                      setDcaSettings(null)
                      setMarketData(null)
                      setTradeHistory([])
                      setProfitData(null)
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableSymbols.map((symbol) => (
                  <option key={symbol.symbol} value={symbol.symbol}>
                    {symbol.name} ({symbol.symbol})
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                切换币种将重置当前DCA状态
              </div>
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
                min="0.01"
                step="0.01"
                placeholder="0.96"
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
                min="0.01"
                step="0.01"
                placeholder="1.80"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={saveSettings}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-sm"
            >
              保存设置
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 交易历史面板 */}
      {showTradeHistory && (
        <div className="mb-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <History className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">交易历史</h3>
          </div>
          {tradeHistory.length > 0 ? (
            <div className="space-y-3">
              {tradeHistory.map((trade) => (
                <div key={trade.id} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        trade.trade_type === 'BUY' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        <span className={`text-xs font-bold ${
                          trade.trade_type === 'BUY' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {trade.trade_type === 'BUY' ? 'B' : 'S'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{trade.symbol}</span>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      trade.trade_type === 'BUY' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {trade.trade_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">数量:</span>
                      <span className="ml-1 font-medium">{trade.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">价格:</span>
                      <span className="ml-1 font-medium">${(parseFloat(String(trade.price || 0))).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">金额:</span>
                      <span className="ml-1 font-medium">${(parseFloat(String(trade.total_amount || 0))).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">策略:</span>
                      <span className="ml-1 font-medium text-xs">{trade.strategy_reason}</span>
                    </div>
                  </div>
                  {trade.notes && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">备注:</span> {trade.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无交易记录</p>
            </div>
          )}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={fetchTradeHistory}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-sm"
            >
              刷新历史
            </button>
            <button
              onClick={() => setShowTradeHistory(false)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">操作失败</h3>
              <div className="text-sm text-red-700 bg-white/50 p-3 rounded-lg border border-red-100">
                <p className="whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 市场数据 */}
      {marketData && (
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">30分钟图表 - EMA89分析</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="text-sm text-gray-600 mb-1">当前价格</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(marketData.currentPrice)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="text-sm text-gray-600 mb-1">EMA89</div>
              <div className="text-xl font-bold text-gray-800">{formatCurrency(marketData.ema89)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="text-sm text-gray-600 mb-1">价格距离EMA89</div>
              <div className={`text-xl font-bold ${
                parseFloat(marketData.priceDistance) < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatPercentage(parseFloat(marketData.priceDistance))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <div className="text-sm text-gray-600 mb-1">交易条件</div>
              <div className="flex items-center">
                {marketData.priceBelowEma ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2" />
                )}
                <span className={`text-sm font-medium ${marketData.priceBelowEma ? 'text-green-600' : 'text-red-600'}`}>
                  {marketData.priceBelowEma ? '满足买入条件' : '不满足买入条件'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 动态加仓幅度 */}
          {multiplierData && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-xs">⚡</span>
                </div>
                <h4 className="text-md font-semibold text-green-800">动态加仓幅度</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-600 mb-1">当前加仓倍数</div>
                  <div className="text-lg font-bold text-green-600">
                    {(multiplierData.value || 0).toFixed(2)}x
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-600 mb-1">策略类型</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {multiplierData.value < 1.3 ? '保守型' : 
                     multiplierData.value > 1.8 ? '激进型' : '平衡型'}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-green-100">
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
        <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-bold text-sm">📈</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">DCA交易状态</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">交易状态</div>
              <div className="flex items-center">
                {dcaSettings.is_active ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-green-600 font-semibold">运行中</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-gray-600 font-semibold">已停止</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">进度</div>
              <div className="text-xl font-bold text-gray-800">
                {dcaSettings.current_order} / {dcaSettings.max_orders}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">已投入</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(dcaSettings.total_invested)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">预计总投入</div>
              <div className="text-xl font-bold text-purple-600">{formatCurrency(calculateExpectedTotal())}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">基础金额</div>
              <div className="text-xl font-bold text-gray-800">{formatCurrency(dcaSettings.amount)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-600 mb-1">剩余投入</div>
              <div className="text-xl font-bold text-orange-600">
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
                  <div className="text-lg font-semibold text-blue-600">${(marketData.currentPrice || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">EMA89</div>
                  <div className="text-lg font-semibold">${(marketData.ema89 || 0).toFixed(2)}</div>
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
          <div className="mt-6">
            <button
              onClick={() => setShowGridDetails(!showGridDetails)}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 shadow-sm"
            >
              {showGridDetails ? '隐藏网格详情' : '显示网格详情'}
              <svg className={`ml-2 w-4 h-4 transition-transform ${showGridDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* 网格详情 */}
          {showGridDetails && gridDetails.length > 0 && (
            <div className="mt-4 p-5 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-bold text-xs">📋</span>
                </div>
                <h4 className="text-md font-semibold text-gray-800">DCA网格详情</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gridDetails.map((grid) => (
                  <div 
                    key={grid.orderNumber}
                    className={`p-4 rounded-xl border shadow-sm transition-all duration-200 ${
                      grid.current 
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-blue-100' 
                        : grid.executed 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-green-100' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-semibold text-gray-800">
                        第{grid.orderNumber}单
                      </div>
                      <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                        grid.current 
                          ? 'bg-blue-100 text-blue-700' 
                          : grid.executed 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {grid.status}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-gray-600">投入金额:</span>
                        <span className="font-bold text-blue-600">${(grid.amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-gray-600">目标价格:</span>
                        <span className="font-bold text-gray-800">${(grid.targetPrice || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-gray-600">价格偏差:</span>
                        <span className="font-bold text-orange-600">{grid.priceDeviation.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-gray-600">累计投入:</span>
                        <span className="font-bold text-purple-600">${grid.cumulativeAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex space-x-4 mb-4">
        {!dcaSettings?.is_active ? (
          <button
            onClick={startDCATrading}
            disabled={loading}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Play className="w-5 h-5 mr-2" />
            {loading ? '启动中...' : '启动DCA交易'}
          </button>
        ) : (
          <button
            onClick={stopDCATrading}
            disabled={loading}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Square className="w-5 h-5 mr-2" />
            {loading ? '停止中...' : '停止DCA交易'}
          </button>
        )}
        
        <button
          onClick={executeDCATrade}
          disabled={loading || !dcaSettings?.is_active}
          className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
            loading || !dcaSettings?.is_active
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : !marketData?.priceBelowEma
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          {loading ? '执行中...' : !marketData?.priceBelowEma ? '强制执行' : '手动执行'}
        </button>
      </div>
      
      {/* 高级控制按钮 */}
      <div className="flex space-x-3 mb-6">
        <button
          onClick={resetDCASettings}
          disabled={loading || !dcaSettings}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {loading ? '重置中...' : '重置DCA设置'}
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          <Settings className="w-4 h-4 mr-2" />
          {loading ? '加载中...' : '修改设置'}
        </button>
        
        <button
          onClick={() => {
            setShowTradeHistory(!showTradeHistory)
            if (!showTradeHistory) {
              fetchTradeHistory()
            }
          }}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          <History className="w-4 h-4 mr-2" />
          {loading ? '加载中...' : '交易历史'}
        </button>
      </div>

      {/* 说明信息 */}
      <div className="mt-6 p-5 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">DCA交易说明</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white/50 p-3 rounded-lg border border-yellow-100">
                  <div className="font-medium text-yellow-800 mb-2">📈 交易策略</div>
                  <ul className="space-y-1 text-sm">
                    <li>• 基于30分钟图表和EMA89线进行自动交易</li>
                    <li>• 当价格跌破EMA89线时自动买入</li>
                    <li>• 订单金额按1.5倍递增（首单80USDT，第二单120USDT...）</li>
                    <li>• 最多执行6次买入订单</li>
                  </ul>
                </div>
                <div className="bg-white/50 p-3 rounded-lg border border-yellow-100">
                  <div className="font-medium text-yellow-800 mb-2">⚙️ 操作说明</div>
                  <ul className="space-y-1 text-sm">
                    <li>• 请确保账户有足够的USDT余额</li>
                    <li>• <strong>强制执行</strong>：当价格未跌破EMA89时，会显示蓝色按钮并提示确认</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}