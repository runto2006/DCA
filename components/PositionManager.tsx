'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, DollarSign, TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Info } from 'lucide-react'

interface Position {
  id: number
  symbol: string
  position_type: string
  entry_price: number
  quantity: number
  total_amount: number
  stop_loss?: number
  take_profit?: number
  strategy_reason?: string
  notes?: string
  entry_date: string
  exit_price?: number
  exit_date?: string
  status: string
  pnl?: number
  pnl_percentage?: number
  // 移动止盈相关字段
  trailing_stop_enabled?: boolean
  trailing_stop_distance?: number
  trailing_stop_price?: number
  highest_price?: number
  lowest_price?: number
}

interface PositionStats {
  totalPositions: number
  activePositions: number
  closedPositions: number
  totalValue: number
  totalUnrealizedPnL: number
  totalRealizedPnL: number
  winRate: number
  avgHoldingTime: number
  maxProfit: number
  maxLoss: number
  profitFactor: number
  totalTrades: number
  profitableTrades: number
  lossTrades: number
}

interface BinanceBalance {
  asset: string
  free: number
  locked: number
  total: number
  price: number
  value: number
}

interface BinanceAccountData {
  timestamp: string
  account: {
    canTrade: boolean
    canWithdraw: boolean
    canDeposit: boolean
    updateTime: number
  }
  balances: {
    SOL: BinanceBalance
    BTC: BinanceBalance
  }
  totalValue: number
}

export default function PositionManager() {
  const [positions, setPositions] = useState<Position[]>([])
  const [stats, setStats] = useState<PositionStats | null>(null)
  const [binanceData, setBinanceData] = useState<BinanceAccountData | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [formData, setFormData] = useState({
    position_type: 'LONG',
    entry_price: '',
    quantity: '',
    stop_loss: '',
    take_profit: '',
    strategy_reason: '',
    notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 移动止盈相关状态
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [trailingStopModal, setTrailingStopModal] = useState<{
    show: boolean
    positionId: number | null
    enabled: boolean
    distance: string
    activationType: 'IMMEDIATE' | 'PROFIT_THRESHOLD'
    profitThreshold: string
    maxDistance: string
    autoAdjust: boolean
  }>({
    show: false,
    positionId: null,
    enabled: false,
    distance: '5',
    activationType: 'IMMEDIATE',
    profitThreshold: '2',
    maxDistance: '15',
    autoAdjust: true
  })

  // 获取持仓数据
  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions')
      const data = await response.json()
      
      if (data.positions && data.stats) {
        setPositions(Array.isArray(data.positions) ? data.positions : [])
        setStats(data.stats)
      } else {
        // 兼容旧格式
        setPositions(Array.isArray(data) ? data : [])
        setStats(null)
      }
    } catch (error) {
      console.error('获取持仓数据失败:', error)
      setPositions([])
      setStats(null)
    }
  }

  // 获取币安账户数据
  const fetchBinanceData = async () => {
    try {
      const response = await fetch('/api/binance/balance')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取币安数据失败')
      }
      const data = await response.json()
      setBinanceData(data)
      setError(null)
    } catch (error) {
      console.error('获取币安数据失败:', error)
      setError(error instanceof Error ? error.message : '未知错误')
      setBinanceData(null)
    }
  }

  // 获取当前价格
  const fetchCurrentPrice = async () => {
    try {
      const response = await fetch('/api/price')
      if (response.ok) {
        const data = await response.json()
        setCurrentPrice(data.price)
      }
    } catch (error) {
      console.error('获取当前价格失败:', error)
    }
  }

  // 处理移动止盈
  const handleTrailingStop = async (positionId: number, enabled: boolean, distance: number) => {
    if (!currentPrice) {
      alert('无法获取当前价格，请稍后重试')
      return
    }

    try {
      const response = await fetch(`/api/positions/${positionId}/trailing-stop`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled,
          distance,
          currentPrice
        }),
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        fetchPositions()
        setTrailingStopModal({
          show: false,
          positionId: null,
          enabled: false,
          distance: '5',
          activationType: 'IMMEDIATE',
          profitThreshold: '2',
          maxDistance: '15',
          autoAdjust: true
        })
      } else {
        const errorData = await response.json()
        alert(`移动止盈操作失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('移动止盈操作失败:', error)
      alert('移动止盈操作失败，请重试')
    }
  }

  // 打开移动止盈设置模态框
  const openTrailingStopModal = (position: Position) => {
    setTrailingStopModal({
      show: true,
      positionId: position.id,
      enabled: position.trailing_stop_enabled || false,
      distance: position.trailing_stop_distance?.toString() || '5',
      activationType: 'IMMEDIATE',
      profitThreshold: '2',
      maxDistance: '15',
      autoAdjust: true
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchPositions(), fetchBinanceData(), fetchCurrentPrice()])
      setLoading(false)
    }
    fetchData()
    
    // 减少API调用频率，从30秒改为60秒
    const interval = setInterval(() => {
      fetchPositions()
      fetchCurrentPrice()
      // 币安余额数据每5分钟更新一次
    }, 60000)
    
    // 币安余额数据单独更新
    const balanceInterval = setInterval(() => {
      fetchBinanceData()
    }, 300000) // 5分钟
    
    return () => {
      clearInterval(interval)
      clearInterval(balanceInterval)
    }
  }, [])

  // 提交新持仓
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: 'SOL',
          position_type: formData.position_type,
          entry_price: parseFloat(formData.entry_price),
          quantity: parseFloat(formData.quantity),
          stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : undefined,
          take_profit: formData.take_profit ? parseFloat(formData.take_profit) : undefined,
          strategy_reason: formData.strategy_reason || undefined,
          notes: formData.notes || undefined
        }),
      })

      if (response.ok) {
        setFormData({ 
          position_type: 'LONG', 
          entry_price: '', 
          quantity: '', 
          stop_loss: '', 
          take_profit: '', 
          strategy_reason: '', 
          notes: '' 
        })
        setShowForm(false)
        fetchPositions()
      } else {
        const errorData = await response.json()
        alert(`创建持仓失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('创建持仓失败:', error)
      alert('创建持仓失败，请重试')
    }
  }

  // 平仓
  const handleClosePosition = async (positionId: number, exitPrice: number) => {
    try {
      const response = await fetch(`/api/positions/${positionId}/close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exit_price: exitPrice }),
      })

      if (response.ok) {
        fetchPositions()
      } else {
        const errorData = await response.json()
        alert(`平仓失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('平仓失败:', error)
      alert('平仓失败，请重试')
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

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100'
      case 'CLOSED':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">持仓管理</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {showStats ? '隐藏统计' : '显示统计'}
          </button>
          <button
            onClick={() => {
              fetchPositions()
              fetchBinanceData()
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            刷新
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建持仓
          </button>
        </div>
      </div>

      {/* 持仓统计 */}
      {showStats && stats && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-white">
          <h3 className="text-lg font-semibold mb-4">持仓统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.activePositions}</div>
              <div className="opacity-90">活跃持仓</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <div className="opacity-90">总持仓价值</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPnlColor(stats.totalUnrealizedPnL)}`}>
                {formatCurrency(stats.totalUnrealizedPnL)}
              </div>
              <div className="opacity-90">浮盈浮亏</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.winRate}%</div>
              <div className="opacity-90">胜率</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="opacity-75">已实现盈亏</div>
              <div className={`font-semibold ${getPnlColor(stats.totalRealizedPnL)}`}>
                {formatCurrency(stats.totalRealizedPnL)}
              </div>
            </div>
            <div>
              <div className="opacity-75">平均持仓时间</div>
              <div className="font-semibold">{stats.avgHoldingTime}天</div>
            </div>
            <div>
              <div className="opacity-75">盈亏比</div>
              <div className="font-semibold">{stats.profitFactor}</div>
            </div>
            <div>
              <div className="opacity-75">最大盈利</div>
              <div className="font-semibold text-green-400">{formatCurrency(stats.maxProfit)}</div>
            </div>
            <div>
              <div className="opacity-75">最大亏损</div>
              <div className="font-semibold text-red-400">{formatCurrency(stats.maxLoss)}</div>
            </div>
            <div>
              <div className="opacity-75">总交易次数</div>
              <div className="font-semibold">{stats.totalTrades}</div>
            </div>
          </div>
        </div>
      )}

      {/* 币安账户余额 */}
      {binanceData && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">币安账户余额</h3>
            <div className="text-sm opacity-90">
              总价值: {formatCurrency(binanceData.totalValue)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="mb-2">
                <div className="text-sm opacity-90">SOL</div>
                <div className="text-lg font-bold">{binanceData.balances.SOL.total.toFixed(6)}</div>
                <div className="text-sm opacity-90">${binanceData.balances.SOL.price.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="opacity-75">总价值</div>
                  <div className="font-semibold">{formatCurrency(binanceData.balances.SOL.value)}</div>
                </div>
                <div>
                  <div className="opacity-75">可用余额</div>
                  <div className="font-semibold">{binanceData.balances.SOL.free.toFixed(6)}</div>
                </div>
              </div>
              {binanceData.balances.SOL.locked > 0 && (
                <div className="mt-1 text-xs opacity-75">
                  冻结: {binanceData.balances.SOL.locked.toFixed(6)}
                </div>
              )}
            </div>
            
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="mb-2">
                <div className="text-sm opacity-90">BTC</div>
                <div className="text-lg font-bold">{binanceData.balances.BTC.total.toFixed(8)}</div>
                <div className="text-sm opacity-90">${binanceData.balances.BTC.price.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="opacity-75">总价值</div>
                  <div className="font-semibold">{formatCurrency(binanceData.balances.BTC.value)}</div>
                </div>
                <div>
                  <div className="opacity-75">可用余额</div>
                  <div className="font-semibold">{binanceData.balances.BTC.free.toFixed(8)}</div>
                </div>
              </div>
              {binanceData.balances.BTC.locked > 0 && (
                <div className="mt-1 text-xs opacity-75">
                  冻结: {binanceData.balances.BTC.locked.toFixed(8)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新建持仓表单 */}
      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">新建持仓</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  持仓类型
                </label>
                <select
                  value={formData.position_type}
                  onChange={(e) => setFormData({...formData, position_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LONG">做多</option>
                  <option value="SHORT">做空</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  入场价格
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entry_price}
                  onChange={(e) => setFormData({...formData, entry_price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数量
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.000000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  止损价格 (可选)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stop_loss}
                  onChange={(e) => setFormData({...formData, stop_loss: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  止盈价格 (可选)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.take_profit}
                  onChange={(e) => setFormData({...formData, take_profit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  策略原因 (可选)
                </label>
                <input
                  type="text"
                  value={formData.strategy_reason}
                  onChange={(e) => setFormData({...formData, strategy_reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：EMA89突破"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注 (可选)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="添加备注信息..."
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                创建持仓
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 持仓列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">持仓列表</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无持仓记录
          </div>
        ) : (
          positions.map((position) => (
            <div key={position.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{position.symbol}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(position.status)}`}>
                      {position.status === 'ACTIVE' ? '活跃' : '已平仓'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      position.position_type === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {position.position_type === 'LONG' ? '做多' : '做空'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    入场时间: {new Date(position.entry_date).toLocaleString('zh-CN')}
                  </div>
                </div>
                
                {position.status === 'ACTIVE' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openTrailingStopModal(position)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        position.trailing_stop_enabled 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {position.trailing_stop_enabled ? '移动止盈' : '设置移动止盈'}
                    </button>
                    <button
                      onClick={() => {
                        const exitPrice = prompt('请输入平仓价格:')
                        if (exitPrice && !isNaN(parseFloat(exitPrice))) {
                          handleClosePosition(position.id, parseFloat(exitPrice))
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      平仓
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">入场价格</div>
                  <div className="font-semibold">{formatCurrency(position.entry_price)}</div>
                </div>
                <div>
                  <div className="text-gray-600">数量</div>
                  <div className="font-semibold">{position.quantity.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-gray-600">持仓价值</div>
                  <div className="font-semibold">
                    {currentPrice ? formatCurrency(currentPrice * position.quantity) : formatCurrency(position.total_amount)}
                </div>
                </div>
                  <div>
                    <div className="text-gray-600">盈亏</div>
                  <div className={`font-semibold ${getPnlColor(currentPrice ? (currentPrice - position.entry_price) * position.quantity : (position.pnl || 0))}`}>
                    {currentPrice ? formatCurrency((currentPrice - position.entry_price) * position.quantity) : formatCurrency(position.pnl || 0)}
                    {currentPrice && (
                      <span className="ml-1">({((currentPrice - position.entry_price) / position.entry_price * 100).toFixed(2)}%)</span>
                      )}
                    </div>
                  </div>
              </div>
              
              {/* 止损止盈信息 */}
              {(position.stop_loss || position.take_profit || position.trailing_stop_enabled) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {position.stop_loss && (
                      <div>
                        <div className="text-gray-600">止损价格</div>
                        <div className="font-semibold text-red-600">{formatCurrency(position.stop_loss)}</div>
                      </div>
                    )}
                    {position.take_profit && (
                      <div>
                        <div className="text-gray-600">止盈价格</div>
                        <div className="font-semibold text-green-600">{formatCurrency(position.take_profit)}</div>
                      </div>
                    )}
                    {position.trailing_stop_enabled && (
                      <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-gray-600">移动止盈状态</div>
                          <button
                            onClick={() => {
                              alert(`移动止盈工作原理：
                              
📊 计算公式：
移动止盈价格 = 追踪最高价 × (1 - 保护距离%)

🎯 您的设置：
- 追踪最高价: $${position.highest_price}
- 保护距离: ${position.trailing_stop_distance}%
- 移动止盈价格: $${position.trailing_stop_price}

📈 工作原理：
1. 系统记录价格达到的最高点
2. 移动止盈价格 = 最高价 × (1 - 距离%)
3. 当价格回撤触及移动止盈价格时触发平仓
4. 移动止盈价格只会向上移动，不会回撤

🔄 动态更新：
- 当价格创新高时，移动止盈价格也会相应上调
- 当价格下跌时，移动止盈价格保持不变
- 这样既保护利润，又给价格上涨留出空间

💡 当前状态：
- 距离触发: ${currentPrice && position.trailing_stop_price ? ((currentPrice - position.trailing_stop_price) / currentPrice * 100).toFixed(2) : '0'}%
- 状态: ${currentPrice && position.trailing_stop_price ? (currentPrice <= position.trailing_stop_price ? '即将触发' : '监控中') : '监控中'}`)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            📖 查看工作原理
                          </button>
                        </div>
                        <div className="space-y-2">
                          {/* 主要信息 */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">触发价格:</span>
                            <span className="font-semibold text-blue-600">
                          {formatCurrency(position.trailing_stop_price || 0)}
                            </span>
                        </div>
                          
                          {/* 距离设置 */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">设置距离:</span>
                            <span className="text-sm font-medium">
                              {position.trailing_stop_distance}%
                            </span>
                          </div>
                          
                          {/* 追踪价格 */}
                        {position.highest_price && position.position_type === 'LONG' && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">追踪最高价:</span>
                              <span className="text-sm font-medium text-green-600">
                                {formatCurrency(position.highest_price)}
                              </span>
                          </div>
                        )}
                        {position.lowest_price && position.position_type === 'SHORT' && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">追踪最低价:</span>
                              <span className="text-sm font-medium text-red-600">
                                {formatCurrency(position.lowest_price)}
                              </span>
                          </div>
                        )}
                          
                          {/* 距离触发 */}
                          {currentPrice && position.trailing_stop_price && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">距离触发:</span>
                              <span className={`text-sm font-medium ${
                                position.position_type === 'LONG' 
                                  ? (currentPrice - position.trailing_stop_price) / currentPrice * 100 < 0.5 
                                    ? 'text-red-600' 
                                    : (currentPrice - position.trailing_stop_price) / currentPrice * 100 < 1 
                                      ? 'text-yellow-600' 
                                      : 'text-green-600'
                                  : (position.trailing_stop_price - currentPrice) / currentPrice * 100 < 0.5 
                                    ? 'text-red-600' 
                                    : (position.trailing_stop_price - currentPrice) / currentPrice * 100 < 1 
                                      ? 'text-yellow-600' 
                                      : 'text-green-600'
                              }`}>
                                {position.position_type === 'LONG' 
                                  ? `${((currentPrice - position.trailing_stop_price) / currentPrice * 100).toFixed(2)}%`
                                  : `${((position.trailing_stop_price - currentPrice) / currentPrice * 100).toFixed(2)}%`
                                }
                              </span>
                      </div>
                    )}
                          
                          {/* 保护利润 */}
                          {currentPrice && position.entry_price && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">保护利润:</span>
                              <span className="text-sm font-medium text-green-600">
                                {position.position_type === 'LONG' 
                                  ? formatCurrency((position.highest_price || position.entry_price) - position.entry_price)
                                  : formatCurrency(position.entry_price - (position.lowest_price || position.entry_price))
                                }
                              </span>
                            </div>
                          )}
                          
                          {/* 状态指示器 */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">状态:</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              {currentPrice && position.trailing_stop_price && (
                                position.position_type === 'LONG' 
                                  ? currentPrice <= position.trailing_stop_price 
                                    ? '即将触发' 
                                    : '监控中'
                                  : currentPrice >= position.trailing_stop_price 
                                    ? '即将触发' 
                                    : '监控中'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 策略信息和备注 */}
              {(position.strategy_reason || position.notes) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {position.strategy_reason && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-600">策略原因</div>
                      <div className="text-sm font-medium">{position.strategy_reason}</div>
                    </div>
                  )}
                  {position.notes && (
                    <div>
                      <div className="text-sm text-gray-600">备注</div>
                      <div className="text-sm">{position.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 移动止盈设置模态框 */}
      {trailingStopModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">移动止盈设置</h3>
              <button
                onClick={() => {
                  alert(`📚 移动止盈详细说明：

🎯 什么是移动止盈？
移动止盈是一种动态风险管理工具，会随着价格有利变动自动调整止损价格，保护已获得的利润。

📊 计算公式：
做多：移动止盈价格 = 追踪最高价 × (1 - 保护距离%)
做空：移动止盈价格 = 追踪最低价 × (1 + 保护距离%)

🔄 工作原理：
1. 系统记录价格达到的极值（做多记录最高价，做空记录最低价）
2. 根据保护距离计算移动止盈价格
3. 当价格回撤触及移动止盈价格时触发平仓
4. 移动止盈价格只会向有利方向移动，不会回撤

⚙️ 设置建议：
- 保守设置：1-2%（紧密保护，适合波动小的市场）
- 平衡设置：3-5%（推荐新手使用）
- 宽松设置：6-10%（给价格更多空间，适合波动大的市场）

💡 使用技巧：
- 根据市场波动性调整保护距离
- 结合其他风险管理工具使用
- 定期检查和优化设置参数`)
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                📖 详细说明
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 基本设置 */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={trailingStopModal.enabled}
                    onChange={(e) => setTrailingStopModal({
                      ...trailingStopModal,
                      enabled: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">启用移动止盈</span>
                </label>
              </div>
              
              {trailingStopModal.enabled && (
                <>
                  {/* 移动止盈距离 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    移动止盈距离 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={trailingStopModal.distance}
                    onChange={(e) => setTrailingStopModal({
                      ...trailingStopModal,
                      distance: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5.0"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    建议设置: 做多 3-10%, 做空 3-10%
                    </div>
                  </div>

                  {/* 激活条件 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      激活条件
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={trailingStopModal.activationType === 'IMMEDIATE'}
                          onChange={() => setTrailingStopModal({
                            ...trailingStopModal,
                            activationType: 'IMMEDIATE'
                          })}
                          className="rounded"
                        />
                        <span className="text-sm">立即激活</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={trailingStopModal.activationType === 'PROFIT_THRESHOLD'}
                          onChange={() => setTrailingStopModal({
                            ...trailingStopModal,
                            activationType: 'PROFIT_THRESHOLD'
                          })}
                          className="rounded"
                        />
                        <span className="text-sm">达到盈利阈值后激活</span>
                      </label>
                    </div>
                  </div>

                  {/* 盈利阈值设置 */}
                  {trailingStopModal.activationType === 'PROFIT_THRESHOLD' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        盈利阈值 (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        value={trailingStopModal.profitThreshold}
                        onChange={(e) => setTrailingStopModal({
                          ...trailingStopModal,
                          profitThreshold: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="2.0"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        当盈利达到此百分比时才开始移动止盈
                  </div>
                </div>
              )}
              
                  {/* 最大距离限制 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大距离限制 (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="50"
                      value={trailingStopModal.maxDistance}
                      onChange={(e) => setTrailingStopModal({
                        ...trailingStopModal,
                        maxDistance: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="15.0"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      防止移动止盈距离过大，建议不超过15%
                    </div>
                  </div>

                  {/* 自动调整 */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={trailingStopModal.autoAdjust}
                        onChange={(e) => setTrailingStopModal({
                          ...trailingStopModal,
                          autoAdjust: e.target.checked
                        })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">自动调整距离</span>
                    </label>
                    <div className="text-xs text-gray-500 mt-1 ml-6">
                      根据市场波动性自动调整移动止盈距离
                    </div>
                  </div>

                  {/* 预览信息 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">设置预览</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>移动止盈距离: {trailingStopModal.distance}%</div>
                      <div>激活条件: {trailingStopModal.activationType === 'IMMEDIATE' ? '立即激活' : `盈利${trailingStopModal.profitThreshold}%后激活`}</div>
                      <div>最大距离限制: {trailingStopModal.maxDistance}%</div>
                      <div>自动调整: {trailingStopModal.autoAdjust ? '启用' : '禁用'}</div>
              {currentPrice && (
                        <div>当前价格: {formatCurrency(currentPrice)}</div>
                      )}
                </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  if (trailingStopModal.positionId && trailingStopModal.enabled) {
                    handleTrailingStop(
                      trailingStopModal.positionId,
                      trailingStopModal.enabled,
                      parseFloat(trailingStopModal.distance)
                    )
                  } else if (trailingStopModal.positionId) {
                    handleTrailingStop(
                      trailingStopModal.positionId,
                      false,
                      0
                    )
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {trailingStopModal.enabled ? '保存设置' : '禁用移动止盈'}
              </button>
              <button
                onClick={() => setTrailingStopModal({
                  show: false,
                  positionId: null,
                  enabled: false,
                  distance: '5',
                  activationType: 'IMMEDIATE',
                  profitThreshold: '2',
                  maxDistance: '15',
                  autoAdjust: true
                })}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 