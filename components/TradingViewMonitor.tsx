'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'

interface SignalData {
  id: string
  originalSignal: any
  tradeSignal: {
    symbol: string
    action: string
    strategy: string
    confidence: number
    exchange: string
    quantity: number
    price?: number
  }
  riskCheck: {
    approved: boolean
    riskScore: number
    reasons: string[]
  }
  executionResult?: {
    success: boolean
    error?: string
  }
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'FAILED'
  createdAt: string
}

interface Statistics {
  totalSignals: number
  executedSignals: number
  rejectedSignals: number
  failedSignals: number
  successRate: number
  avgConfidence: number
  totalPnL: number
}

export function TradingViewMonitor() {
  const [signals, setSignals] = useState<SignalData[]>([])
  const [statistics, setStatistics] = useState<Statistics>({
    totalSignals: 0,
    executedSignals: 0,
    rejectedSignals: 0,
    failedSignals: 0,
    successRate: 0,
    avgConfidence: 0,
    totalPnL: 0
  })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // 加载信号历史
      const signalsResponse = await fetch('/api/tradingview/webhook?limit=50')
      if (signalsResponse.ok) {
        const signalsData = await signalsResponse.json()
        setSignals(signalsData.data || [])
      }

      // 加载统计数据
      const statsResponse = await fetch('/api/tradingview/statistics')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.data && statsData.data.summary) {
          // 转换API返回的数据格式为组件期望的格式
          const summary = statsData.data.summary
          setStatistics({
            totalSignals: summary.total_signals || 0,
            executedSignals: summary.executed_signals || 0,
            rejectedSignals: summary.rejected_signals || 0,
            failedSignals: summary.failed_signals || 0,
            successRate: summary.avg_win_rate || 0,
            avgConfidence: summary.avg_confidence || 0,
            totalPnL: summary.total_pnl || 0
          })
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'FAILED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return 'text-green-600 bg-green-100'
      case 'REJECTED':
        return 'text-red-600 bg-red-100'
      case 'FAILED':
        return 'text-orange-600 bg-orange-100'
      case 'PENDING':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getActionIcon = (action: string) => {
    return action === 'BUY' ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const filteredSignals = signals.filter(signal => {
    const matchesFilter = filter === '' || 
      signal.tradeSignal.symbol.toLowerCase().includes(filter.toLowerCase()) ||
      signal.tradeSignal.strategy.toLowerCase().includes(filter.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || signal.status === statusFilter
    
    return matchesFilter && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载数据中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">TradingView信号监控</h2>
        <Button onClick={handleRefresh} disabled={refreshing} variant="secondary">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总信号数</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalSignals || 0}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">执行成功</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.executedSignals || 0}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">被拒绝</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.rejectedSignals || 0}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">成功率</p>
                <p className="text-2xl font-bold text-gray-900">{(statistics.successRate || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 过滤和搜索 */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索交易对或策略..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">所有状态</option>
                <option value="EXECUTED">执行成功</option>
                <option value="REJECTED">被拒绝</option>
                <option value="FAILED">执行失败</option>
                <option value="PENDING">等待中</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 信号列表 */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">信号历史</h3>
          {filteredSignals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无信号数据
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSignals.map((signal) => (
                <div key={signal.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getActionIcon(signal.tradeSignal.action)}
                      <div>
                        <h4 className="font-medium">{signal.tradeSignal.symbol}</h4>
                        <p className="text-sm text-gray-500">{signal.tradeSignal.strategy}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(signal.status)}`}>
                        {signal.status}
                      </span>
                      {getStatusIcon(signal.status)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">操作:</span>
                      <span className="ml-2 font-medium">{signal.tradeSignal.action}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">交易所:</span>
                      <span className="ml-2 font-medium">{signal.tradeSignal.exchange.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">可信度:</span>
                      <span className="ml-2 font-medium">{(signal.tradeSignal.confidence || 0).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">数量:</span>
                      <span className="ml-2 font-medium">{signal.tradeSignal.quantity || 0}</span>
                    </div>
                  </div>
                  
                  {signal.riskCheck && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-500 text-sm">风险评分:</span>
                          <span className="ml-2 text-sm font-medium">{signal.riskCheck.riskScore}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">风险检查:</span>
                          <span className={`ml-2 text-sm font-medium ${signal.riskCheck.approved ? 'text-green-600' : 'text-red-600'}`}>
                            {signal.riskCheck.approved ? '通过' : '未通过'}
                          </span>
                        </div>
                      </div>
                      {signal.riskCheck.reasons && signal.riskCheck.reasons.length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-500 text-sm">拒绝原因:</span>
                          <div className="mt-1">
                            {signal.riskCheck.reasons.map((reason, index) => (
                              <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {signal.executionResult && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">执行结果:</span>
                        <span className={`text-sm font-medium ${signal.executionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {signal.executionResult.success ? '成功' : '失败'}
                        </span>
                      </div>
                      {signal.executionResult.error && (
                        <p className="mt-1 text-sm text-red-600">{signal.executionResult.error}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-500 text-sm">
                      时间: {new Date(signal.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
} 