'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Switch } from './ui/Switch'
import { Badge } from './ui/Badge'
import { Alert, AlertDescription } from './ui/Alert'
import { Loader2, Settings, Save, TestTube, AlertTriangle, CheckCircle } from 'lucide-react'

interface TradingViewConfig {
  enabled: boolean
  webhookUrl: string
  secretKey: string
  defaultExchange: string
  exchangePriority: string[]
  maxDailyLoss: number
  maxPositionSize: number
  minConfidence: number
  maxLeverage: number
  allowedStrategies: string[]
  blockedSymbols: string[]
  tradingHours: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
  notifications: {
    email: boolean
    telegram: boolean
    webhook: boolean
  }
}

export function TradingViewSettings() {
  const [config, setConfig] = useState<TradingViewConfig>({
    enabled: false,
    webhookUrl: '',
    secretKey: '',
    defaultExchange: 'binance',
    exchangePriority: ['binance', 'okx', 'bitget', 'gate'],
    maxDailyLoss: 1000,
    maxPositionSize: 0.1,
    minConfidence: 70,
    maxLeverage: 5,
    allowedStrategies: [],
    blockedSymbols: [],
    tradingHours: {
      enabled: true,
      start: '09:00',
      end: '17:00',
      timezone: 'Asia/Shanghai'
    },
    notifications: {
      email: false,
      telegram: false,
      webhook: false
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [newStrategy, setNewStrategy] = useState('')
  const [newSymbol, setNewSymbol] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/tradingview/config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data.data)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch('/api/tradingview/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('配置保存成功！')
      } else {
        alert('配置保存失败！')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      alert('配置保存失败！')
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setMessage(null)
    
    try {
      const testSignal = {
        symbol: 'SOLUSDT',
        action: 'BUY',
        strategy: 'test_connection',
        confidence: 80,
        timestamp: Date.now(),
        source: 'test'
      }
      
      const response = await fetch('/api/tradingview/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSignal)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: '连接测试成功！信号已处理' })
      } else {
        setMessage({ type: 'info', text: `连接正常，但信号被拒绝: ${result.details?.join(', ')}` })
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      setMessage({ type: 'error', text: '连接测试失败' })
    } finally {
      setTesting(false)
    }
  }

  const addStrategy = () => {
    if (newStrategy && !config.allowedStrategies.includes(newStrategy)) {
      setConfig(prev => ({
        ...prev,
        allowedStrategies: [...prev.allowedStrategies, newStrategy]
      }))
      setNewStrategy('')
    }
  }

  const removeStrategy = (strategy: string) => {
    setConfig(prev => ({
      ...prev,
      allowedStrategies: prev.allowedStrategies.filter(s => s !== strategy)
    }))
  }

  const addBlockedSymbol = () => {
    if (newSymbol && !config.blockedSymbols.includes(newSymbol)) {
      setConfig(prev => ({
        ...prev,
        blockedSymbols: [...prev.blockedSymbols, newSymbol.toUpperCase()]
      }))
      setNewSymbol('')
    }
  }

  const removeBlockedSymbol = (symbol: string) => {
    setConfig(prev => ({
      ...prev,
      blockedSymbols: prev.blockedSymbols.filter(s => s !== symbol)
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载配置中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Settings className="mr-2 h-6 w-6" />
          TradingView信号设置
        </h2>
        <div className="flex space-x-2">
          <Button 
            onClick={handleTestConnection} 
            disabled={testing || !config.enabled}
            variant="secondary"
            size="sm"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
            测试连接
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            保存配置
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 
                         message.type === 'success' ? 'border-green-200 bg-green-50' : 
                         'border-blue-200 bg-blue-50'}>
          {message.type === 'error' ? <AlertTriangle className="h-4 w-4" /> :
           message.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
           <AlertTriangle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* 基础设置 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">基础配置</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">启用TradingView信号</label>
                <p className="text-sm text-gray-500">开启后系统将接收并处理TradingView信号</p>
              </div>
              <Switch 
                checked={config.enabled} 
                onCheckedChange={(enabled: boolean) => 
                  setConfig(prev => ({ ...prev, enabled }))
                }
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Webhook URL</label>
              <p className="text-sm text-gray-500 mb-2">在TradingView中配置此URL接收信号</p>
              <Input 
                value={config.webhookUrl} 
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                }
                placeholder="https://your-domain.com/api/tradingview/webhook"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">密钥</label>
              <p className="text-sm text-gray-500 mb-2">用于验证信号来源的安全性</p>
              <Input 
                type="password"
                value={config.secretKey} 
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, secretKey: e.target.value }))
                }
                placeholder="输入密钥"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 交易所设置 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">交易所配置</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">默认交易所</label>
              <select 
                value={config.defaultExchange}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, defaultExchange: e.target.value }))
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="binance">Binance</option>
                <option value="okx">OKX</option>
                <option value="bitget">Bitget</option>
                <option value="gate">Gate.io</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">交易所优先级</label>
              <p className="text-sm text-gray-500 mb-2">按优先级顺序选择交易所执行订单</p>
              <div className="flex flex-wrap gap-2">
                {config.exchangePriority.map((exchange, index) => (
                  <Badge key={exchange} variant="secondary">
                    {index + 1}. {exchange.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 风险控制 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">风险控制</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">最大日亏损 (USDT)</label>
              <Input 
                type="number"
                value={config.maxDailyLoss}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, maxDailyLoss: parseFloat(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">最大仓位比例 (%)</label>
              <Input 
                type="number"
                step="0.1"
                value={config.maxPositionSize * 100}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, maxPositionSize: parseFloat(e.target.value) / 100 }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">最小可信度 (%)</label>
              <Input 
                type="number"
                value={config.minConfidence}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, minConfidence: parseInt(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">最大杠杆倍数</label>
              <Input 
                type="number"
                value={config.maxLeverage}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, maxLeverage: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 交易时间 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">交易时间</h3>
          <p className="text-sm text-gray-500 mb-4">虚拟币交易为24小时不间断，您可以选择是否启用时间限制</p>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="text-sm font-medium">启用交易时间限制</label>
              <p className="text-sm text-gray-500">仅在指定时间内执行交易</p>
            </div>
            <Switch 
              checked={config.tradingHours.enabled} 
              onCheckedChange={(enabled: boolean) => 
                setConfig(prev => ({ 
                  ...prev, 
                  tradingHours: { ...prev.tradingHours, enabled }
                }))
              }
            />
          </div>
          
          {config.tradingHours.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">开始时间</label>
                <Input 
                  type="time"
                  value={config.tradingHours.start}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      tradingHours: { ...prev.tradingHours, start: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">结束时间</label>
                <Input 
                  type="time"
                  value={config.tradingHours.end}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      tradingHours: { ...prev.tradingHours, end: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">时区</label>
                <select 
                  value={config.tradingHours.timezone}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      tradingHours: { ...prev.tradingHours, timezone: e.target.value }
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">美国东部时间 (UTC-5)</option>
                  <option value="Europe/London">英国时间 (UTC+0)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 策略过滤 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">策略过滤</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">允许的策略</label>
              <p className="text-sm text-gray-500 mb-2">只执行来自这些策略的信号（留空允许所有策略）</p>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={newStrategy}
                  onChange={(e) => setNewStrategy(e.target.value)}
                  placeholder="输入策略名称"
                  onKeyPress={(e) => e.key === 'Enter' && addStrategy()}
                />
                <Button onClick={addStrategy} size="sm">添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.allowedStrategies.map(strategy => (
                  <div key={strategy} onClick={() => removeStrategy(strategy)}>
                    <Badge variant="outline" className="cursor-pointer">
                      {strategy} ×
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">屏蔽的交易对</label>
              <p className="text-sm text-gray-500 mb-2">不执行这些交易对的信号</p>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="输入交易对，如 BTCUSDT"
                  onKeyPress={(e) => e.key === 'Enter' && addBlockedSymbol()}
                />
                <Button onClick={addBlockedSymbol} size="sm">添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.blockedSymbols.map(symbol => (
                  <div key={symbol} onClick={() => removeBlockedSymbol(symbol)}>
                    <Badge variant="destructive" className="cursor-pointer">
                      {symbol} ×
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 通知设置 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">通知设置</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">邮件通知</label>
                <p className="text-sm text-gray-500">信号执行结果邮件通知</p>
              </div>
              <Switch 
                checked={config.notifications.email} 
                onCheckedChange={(email: boolean) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, email }
                  }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Telegram通知</label>
                <p className="text-sm text-gray-500">信号执行结果Telegram通知</p>
              </div>
              <Switch 
                checked={config.notifications.telegram} 
                onCheckedChange={(telegram: boolean) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, telegram }
                  }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Webhook通知</label>
                <p className="text-sm text-gray-500">信号执行结果Webhook通知</p>
              </div>
              <Switch 
                checked={config.notifications.webhook} 
                onCheckedChange={(webhook: boolean) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, webhook }
                  }))
                }
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
} 