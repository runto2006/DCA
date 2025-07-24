'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  Play, 
  Square, 
  Settings, 
  History,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface ArbitrageOpportunity {
  symbol: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  spread: number
  spreadPercent: number
  estimatedProfit: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp: Date
}

interface ArbitrageStatus {
  isEnabled: boolean
  lastCheck: Date
  activeOpportunities: number
  totalProfit: number
  totalTrades: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  warnings: string[]
}

interface ArbitrageTrade {
  id: string
  symbol: string
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  amount: number
  profit: number
  profitPercent: number
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED'
  timestamp: Date
  executionTime?: number
  error?: string
}

export default function ArbitrageProtectionPanel() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [status, setStatus] = useState<ArbitrageStatus | null>(null)
  const [trades, setTrades] = useState<ArbitrageTrade[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'opportunities' | 'status' | 'history'>('opportunities')
  const [selectedSymbol, setSelectedSymbol] = useState('SOLUSDT')

  // 获取套利机会
  const fetchOpportunities = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/arbitrage?action=opportunities&symbol=${selectedSymbol}`)
      const data = await response.json()
      
      if (data.success) {
        setOpportunities(data.data.opportunities)
      }
    } catch (error) {
      console.error('获取套利机会失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取状态
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/arbitrage?action=status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data.status)
      }
    } catch (error) {
      console.error('获取状态失败:', error)
    }
  }

  // 获取交易历史
  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/arbitrage?action=history&limit=20')
      const data = await response.json()
      
      if (data.success) {
        setTrades(data.data.history)
      }
    } catch (error) {
      console.error('获取交易历史失败:', error)
    }
  }

  // 执行套利
  const executeArbitrage = async (opportunity: ArbitrageOpportunity, amount: number) => {
    try {
      const response = await fetch('/api/arbitrage?action=execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity, amount })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`套利执行成功！利润: ${data.data.trade.profit.toFixed(4)} USDT`)
        fetchOpportunities()
        fetchHistory()
      } else {
        alert(`套利执行失败: ${data.error}`)
      }
    } catch (error) {
      console.error('执行套利失败:', error)
      alert('执行套利失败')
    }
  }

  // 紧急停止
  const emergencyStop = async () => {
    if (!confirm('确定要紧急停止所有套利操作吗？')) return
    
    try {
      const response = await fetch('/api/arbitrage?action=emergency-stop', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('紧急停止执行成功')
        fetchStatus()
      } else {
        alert(`紧急停止失败: ${data.error}`)
      }
    } catch (error) {
      console.error('紧急停止失败:', error)
      alert('紧急停止失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    fetchOpportunities()
    fetchStatus()
    fetchHistory()
  }, [selectedSymbol])

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'opportunities') {
        fetchOpportunities()
      } else if (activeTab === 'status') {
        fetchStatus()
      }
    }, 10000) // 每10秒刷新一次

    return () => clearInterval(interval)
  }, [activeTab, selectedSymbol])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'HIGH': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXECUTED': return 'text-green-600'
      case 'PENDING': return 'text-yellow-600'
      case 'FAILED': return 'text-red-600'
      case 'CANCELLED': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">套利保护系统</h2>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="SOLUSDT">SOL/USDT</option>
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
          </select>
          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'opportunities'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          套利机会
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'status'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          系统状态
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4 inline mr-2" />
          交易历史
        </button>
      </div>

      {/* 套利机会 */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">检测套利机会中...</p>
            </div>
          ) : opportunities.length > 0 ? (
            opportunities.map((opportunity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-900">{opportunity.symbol}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(opportunity.risk)}`}>
                      {opportunity.risk} 风险
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      +{opportunity.spreadPercent.toFixed(3)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      价差: ${opportunity.spread.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">买入</div>
                    <div className="text-lg font-bold text-blue-900">{opportunity.buyExchange}</div>
                    <div className="text-sm text-blue-700">${opportunity.buyPrice.toFixed(4)}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">卖出</div>
                    <div className="text-lg font-bold text-green-900">{opportunity.sellExchange}</div>
                    <div className="text-sm text-green-700">${opportunity.sellPrice.toFixed(4)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    预计利润: <span className="font-semibold text-green-600">${opportunity.estimatedProfit.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => executeArbitrage(opportunity, 10)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    执行套利
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">暂无套利机会</p>
              <p className="text-sm text-gray-500">当前价差不足以覆盖交易成本</p>
            </div>
          )}
        </div>
      )}

      {/* 系统状态 */}
      {activeTab === 'status' && status && (
        <div className="space-y-6">
          {/* 状态概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="ml-2 text-sm text-blue-600">活跃机会</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{status.activeOpportunities}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="ml-2 text-sm text-green-600">总利润</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">${status.totalProfit.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <History className="w-5 h-5 text-purple-600" />
                <span className="ml-2 text-sm text-purple-600">总交易</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 mt-1">{status.totalTrades}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-orange-600" />
                <span className="ml-2 text-sm text-orange-600">风险等级</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${getRiskColor(status.riskLevel)}`}>
                {status.riskLevel}
              </div>
            </div>
          </div>

          {/* 系统状态 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">系统状态</h3>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${status.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600">
                  {status.isEnabled ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              最后检查: {new Date(status.lastCheck).toLocaleString()}
            </div>
          </div>

          {/* 警告信息 */}
          {status.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="font-semibold text-yellow-800">系统警告</h3>
              </div>
              <ul className="space-y-1">
                {status.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={emergencyStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Square className="w-4 h-4 inline mr-2" />
              紧急停止
            </button>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              刷新状态
            </button>
          </div>
        </div>
      )}

      {/* 交易历史 */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {trades.length > 0 ? (
            trades.map((trade) => (
              <div key={trade.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-900">{trade.symbol}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                      {trade.status === 'EXECUTED' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {trade.status === 'FAILED' && <XCircle className="w-3 h-3 inline mr-1" />}
                      {trade.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(4)} USDT
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="text-sm">
                    <span className="text-gray-600">买入:</span>
                    <span className="font-medium ml-1">{trade.buyExchange} @ ${trade.buyPrice.toFixed(4)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">卖出:</span>
                    <span className="font-medium ml-1">{trade.sellExchange} @ ${trade.sellPrice.toFixed(4)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>数量: {trade.amount}</span>
                  <span>利润率: {trade.profitPercent.toFixed(3)}%</span>
                  {trade.executionTime && (
                    <span>执行时间: {trade.executionTime}ms</span>
                  )}
                </div>

                {trade.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    错误: {trade.error}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">暂无交易历史</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 