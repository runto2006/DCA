'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

interface Trade {
  id: number
  symbol: string
  trade_type: string
  price: number
  quantity: number
  total_amount: number
  strategy_reason?: string
  timestamp: string
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  // 获取交易历史
  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades')
      const data = await response.json()
      setTrades(data)
      setLoading(false)
    } catch (error) {
      console.error('获取交易历史失败:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">交易历史</h2>
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">交易历史</h2>
      
      <div className="space-y-4">
        {trades.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无交易记录
          </div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {trade.trade_type === 'BUY' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600 mr-2" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600 mr-2" />
                  )}
                  <span className="font-semibold">
                    {trade.symbol} {trade.trade_type === 'BUY' ? '买入' : '卖出'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(trade.price)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {trade.quantity} SOL
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">交易金额:</span>
                  <span className="ml-2 font-medium">{formatCurrency(trade.total_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">交易类型:</span>
                  <span className={`ml-2 font-medium ${
                    trade.trade_type === 'BUY' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trade.trade_type === 'BUY' ? '买入' : '卖出'}
                  </span>
                </div>
              </div>

              {trade.strategy_reason && (
                <div className="mb-2">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">策略原因:</span>
                  <span className="ml-2 text-sm">{trade.strategy_reason}</span>
                </div>
              )}

              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {formatDate(trade.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 统计信息 */}
      {trades.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-3">交易统计</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">总交易次数:</span>
              <span className="ml-2 font-medium">{trades.length}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">总交易金额:</span>
              <span className="ml-2 font-medium">
                {formatCurrency(trades.reduce((sum, trade) => sum + trade.total_amount, 0))}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">买入次数:</span>
              <span className="ml-2 font-medium text-green-600">
                {trades.filter(t => t.trade_type === 'BUY').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">卖出次数:</span>
              <span className="ml-2 font-medium text-red-600">
                {trades.filter(t => t.trade_type === 'SELL').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 