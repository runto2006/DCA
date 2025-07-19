'use client'

import { useState, useEffect } from 'react'

interface TradeFormData {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: string
  price: string
  strategy_reason: string
}

interface BinanceBalance {
  SOL: {
    asset: string
    free: number
    locked: number
    total: number
    price: number
    value: number
  }
  BTC: {
    asset: string
    free: number
    locked: number
    total: number
    price: number
    value: number
  }
}

interface BinanceData {
  timestamp: string
  account: {
    canTrade: boolean
    canWithdraw: boolean
    canDeposit: boolean
    updateTime: number
  }
  balances: BinanceBalance
  totalValue: number
}

export default function RealTradePanel() {
  const [loading, setLoading] = useState(false)
  const [canTrade, setCanTrade] = useState(false)
  const [binanceData, setBinanceData] = useState<BinanceData | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [showForm, setShowForm] = useState(false)
  const [tradeResult, setTradeResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const [formData, setFormData] = useState<TradeFormData>({
    symbol: 'SOLUSDT',
    side: 'BUY',
    quantity: '',
    price: '',
    strategy_reason: ''
  })

  // 获取币安账户数据
  const fetchBinanceData = async () => {
    try {
      const response = await fetch('/api/binance/balance')
      if (response.ok) {
        const data = await response.json()
        setBinanceData(data)
        setCanTrade(data.account.canTrade)
      } else {
        const errorData = await response.json()
        setError(`获取账户数据失败: ${errorData.error}`)
      }
    } catch (error) {
      console.error('获取币安数据失败:', error)
      setError('获取账户数据失败')
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
      console.error('获取价格失败:', error)
    }
  }

  // 检查交易权限
  const checkTradingPermissions = async () => {
    try {
      const response = await fetch('/api/binance/trade')
      if (response.ok) {
        const data = await response.json()
        setCanTrade(data.canTrade)
      }
    } catch (error) {
      console.error('检查交易权限失败:', error)
      setCanTrade(false)
    }
  }

  useEffect(() => {
    fetchBinanceData()
    fetchCurrentPrice()
    checkTradingPermissions()
    
    // 定期更新数据
    const interval = setInterval(() => {
      fetchBinanceData()
      fetchCurrentPrice()
    }, 30000) // 30秒更新一次

    return () => clearInterval(interval)
  }, [])

  // 提交交易
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTradeResult(null)

    try {
      const response = await fetch('/api/binance/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: formData.symbol,
          side: formData.side,
          quantity: parseFloat(formData.quantity),
          price: formData.price ? parseFloat(formData.price) : undefined,
          strategy_reason: formData.strategy_reason || '手动交易'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setTradeResult(result)
        setFormData({
          symbol: 'SOLUSDT',
          side: 'BUY',
          quantity: '',
          price: '',
          strategy_reason: ''
        })
        setShowForm(false)
        
        // 刷新账户数据
        setTimeout(() => {
          fetchBinanceData()
        }, 2000)
      } else {
        setError(result.error || '交易执行失败')
      }
    } catch (error) {
      console.error('交易执行失败:', error)
      setError('交易执行失败，请重试')
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

  // 格式化数字
  const formatNumber = (num: number, decimals: number = 4) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">真实交易面板</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${canTrade ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium ${canTrade ? 'text-green-600' : 'text-red-600'}`}>
            {canTrade ? '交易已启用' : '交易未启用'}
          </span>
        </div>
      </div>

      {/* 风险提示 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">风险提示</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>• 这是真实交易功能，将使用您的币安账户进行实际交易</p>
              <p>• 请确保您了解交易风险，并仔细核对交易信息</p>
              <p>• 建议先使用小额资金测试交易功能</p>
              <p>• 交易前请确认您的API密钥具有交易权限</p>
            </div>
          </div>
        </div>
      </div>

      {/* 账户余额 */}
      {binanceData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">SOL余额</h3>
            <p className="text-2xl font-bold text-blue-900">
              {formatNumber(binanceData.balances.SOL.total)}
            </p>
            <p className="text-sm text-blue-600">
              价值: {formatCurrency(binanceData.balances.SOL.value)}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-orange-800">BTC余额</h3>
            <p className="text-2xl font-bold text-orange-900">
              {formatNumber(binanceData.balances.BTC.total, 6)}
            </p>
            <p className="text-sm text-orange-600">
              价值: {formatCurrency(binanceData.balances.BTC.value)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800">总资产</h3>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(binanceData.totalValue)}
            </p>
            <p className="text-sm text-green-600">
              当前价格: ${formatNumber(currentPrice)}
            </p>
          </div>
        </div>
      )}

      {/* 交易表单 */}
      {!showForm ? (
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            disabled={!canTrade}
            className={`px-6 py-3 rounded-lg font-medium ${
              canTrade
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canTrade ? '开始交易' : '交易功能未启用'}
          </button>
          {!canTrade && (
            <p className="mt-2 text-sm text-gray-600">
              请检查币安API密钥配置和交易权限
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                交易对
              </label>
              <select
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="BTCUSDT">BTC/USDT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                交易方向
              </label>
              <select
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value as 'BUY' | 'SELL' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BUY">买入</option>
                <option value="SELL">卖出</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数量
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="输入交易数量"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                价格 (可选，留空为市价单)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="输入限价，留空为市价"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              交易原因 (可选)
            </label>
            <input
              type="text"
              value={formData.strategy_reason}
              onChange={(e) => setFormData({ ...formData, strategy_reason: e.target.value })}
              placeholder="例如：策略信号、手动操作等"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 交易预览 */}
          {formData.quantity && currentPrice && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">交易预览</h4>
              <div className="text-sm text-gray-600">
                <p>交易对: {formData.symbol}</p>
                <p>方向: {formData.side === 'BUY' ? '买入' : '卖出'}</p>
                <p>数量: {formData.quantity}</p>
                <p>价格: {formData.price || `市价 (当前: $${formatNumber(currentPrice)})`}</p>
                <p>预估金额: {formatCurrency(parseFloat(formData.quantity) * (parseFloat(formData.price) || currentPrice))}</p>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading || !formData.quantity}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                loading || !formData.quantity
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : formData.side === 'BUY'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading ? '执行中...' : `${formData.side === 'BUY' ? '确认买入' : '确认卖出'}`}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">交易失败</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 交易结果 */}
      {tradeResult && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">交易成功</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>订单ID: {tradeResult.orderId}</p>
                <p>交易对: {tradeResult.symbol}</p>
                <p>方向: {tradeResult.side === 'BUY' ? '买入' : '卖出'}</p>
                <p>数量: {tradeResult.quantity}</p>
                <p>价格: ${formatNumber(tradeResult.price)}</p>
                <p>金额: {formatCurrency(tradeResult.amount)}</p>
                <p>状态: {tradeResult.status}</p>
                <p>时间: {new Date(tradeResult.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 