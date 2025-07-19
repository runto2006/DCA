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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchPositions(), fetchBinanceData()])
      setLoading(false)
    }
    fetchData()
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
                  <div className="font-semibold">{formatCurrency(position.total_amount)}</div>
                </div>
                {position.pnl !== undefined && (
                  <div>
                    <div className="text-gray-600">盈亏</div>
                    <div className={`font-semibold ${getPnlColor(position.pnl)}`}>
                      {formatCurrency(position.pnl)}
                      {position.pnl_percentage && (
                        <span className="ml-1">({position.pnl_percentage.toFixed(2)}%)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 止损止盈信息 */}
              {(position.stop_loss || position.take_profit) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
    </div>
  )
} 