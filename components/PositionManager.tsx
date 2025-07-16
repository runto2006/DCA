'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

interface Position {
  id: number
  symbol: string
  position_type: string
  entry_price: number
  quantity: number
  entry_date: string
  exit_price?: number
  exit_date?: string
  status: string
  pnl?: number
  pnl_percentage?: number
}

export default function PositionManager() {
  const [positions, setPositions] = useState<Position[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    position_type: 'LONG',
    entry_price: '',
    quantity: ''
  })

  // 获取持仓数据
  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions')
      const data = await response.json()
      // 确保数据是数组格式
      setPositions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('获取持仓数据失败:', error)
      setPositions([])
    }
  }

  useEffect(() => {
    fetchPositions()
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
          quantity: parseFloat(formData.quantity)
        }),
      })

      if (response.ok) {
        setFormData({ position_type: 'LONG', entry_price: '', quantity: '' })
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

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">持仓管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          新建持仓
        </button>
      </div>

      {/* 新建持仓表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                持仓类型
              </label>
              <select
                value={formData.position_type}
                onChange={(e) => setFormData({ ...formData, position_type: e.target.value })}
                className="input-field"
              >
                <option value="LONG">做多</option>
                <option value="SHORT">做空</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                入场价格
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                数量
              </label>
              <input
                type="number"
                step="0.000001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input-field"
                placeholder="0.000000"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button type="submit" className="btn-primary">
              创建持仓
            </button>
          </div>
        </form>
      )}

      {/* 持仓列表 */}
      <div className="space-y-4">
        {positions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无持仓记录
          </div>
        ) : (
          positions.map((position) => (
            <div
              key={position.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {position.position_type === 'LONG' ? (
                    <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 mr-2" />
                  )}
                  <span className="font-semibold">
                    {position.symbol} {position.position_type === 'LONG' ? '做多' : '做空'}
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  position.status === 'OPEN' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {position.status === 'OPEN' ? '持仓中' : '已平仓'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">入场价格:</span>
                  <span className="ml-2 font-medium">{formatCurrency(position.entry_price)}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">数量:</span>
                  <span className="ml-2 font-medium">{position.quantity}</span>
                </div>
                {position.exit_price && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">出场价格:</span>
                    <span className="ml-2 font-medium">{formatCurrency(position.exit_price)}</span>
                  </div>
                )}
                {position.pnl !== undefined && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">盈亏:</span>
                    <span className={`ml-2 font-medium ${getPnlColor(position.pnl)}`}>
                      {formatCurrency(position.pnl)} ({position.pnl_percentage?.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                入场时间: {new Date(position.entry_date).toLocaleString('zh-CN')}
              </div>

              {position.status === 'OPEN' && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      const exitPrice = prompt('请输入出场价格:')
                      if (exitPrice) {
                        handleClosePosition(position.id, parseFloat(exitPrice))
                      }
                    }}
                    className="btn-danger text-sm"
                  >
                    <Minus className="w-3 h-3 mr-1" />
                    平仓
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 