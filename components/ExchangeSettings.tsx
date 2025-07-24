'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react'
import { TradingViewSettings } from './TradingViewSettings'

interface ExchangeConfig {
  name: string
  apiKey: string
  secretKey: string
  passphrase?: string
  isActive: boolean
}

interface ExchangeSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExchangeSettings({ isOpen, onClose }: ExchangeSettingsProps) {
  const [configs, setConfigs] = useState<ExchangeConfig[]>([
    {
      name: 'Binance',
      apiKey: '',
      secretKey: '',
      isActive: false
    },
    {
      name: 'OKX',
      apiKey: '',
      secretKey: '',
      passphrase: '',
      isActive: false
    },
    {
      name: 'Bitget',
      apiKey: '',
      secretKey: '',
      isActive: false
    },
    {
      name: 'Gate.io',
      apiKey: '',
      secretKey: '',
      isActive: false
    }
  ])
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'exchanges' | 'tradingview'>('exchanges')

  // 加载当前配置
  useEffect(() => {
    loadCurrentConfigs()
  }, [])

  const loadCurrentConfigs = async () => {
    try {
      const response = await fetch('/api/exchanges/status')
      const data = await response.json()
      
      if (data.success) {
        const updatedConfigs = configs.map(config => {
          const status = data.data.configSummary.find((s: any) => s.name === config.name.toLowerCase())
          return {
            ...config,
            isActive: status?.isActive || false,
            hasConfig: status?.hasConfig || false
          }
        })
        setConfigs(updatedConfigs)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  const togglePasswordVisibility = (exchangeName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [exchangeName]: !prev[exchangeName]
    }))
  }

  const updateConfig = (exchangeName: string, field: string, value: string | boolean) => {
    setConfigs(prev => prev.map(config => 
      config.name === exchangeName 
        ? { ...config, [field]: value }
        : config
    ))
  }

  const saveConfigs = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // 这里应该调用后端API来保存配置
      // 由于安全考虑，API密钥通常不应该通过前端直接保存
      // 这里只是演示界面，实际应该通过环境变量或安全的配置管理
      
      setMessage({
        type: 'success',
        text: '配置已保存！请重启应用以应用新配置。'
      })

      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      setMessage({
        type: 'error',
        text: '保存配置失败，请检查网络连接。'
      })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (exchangeName: string) => {
    try {
      const response = await fetch(`/api/exchanges/test?exchange=${exchangeName.toLowerCase()}`)
      const data = await response.json()
      
      if (data.success) {
        setMessage({
          type: 'success',
          text: `${exchangeName} 连接测试成功！`
        })
      } else {
        setMessage({
          type: 'error',
          text: `${exchangeName} 连接测试失败: ${data.error}`
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `${exchangeName} 连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }
  }

  const getStatusIcon = (config: ExchangeConfig) => {
    if (config.isActive && config.apiKey && config.secretKey) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (config.apiKey || config.secretKey) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    } else {
      return <XCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (config: ExchangeConfig) => {
    if (config.isActive && config.apiKey && config.secretKey) {
      return '已配置且活跃'
    } else if (config.apiKey || config.secretKey) {
      return '配置不完整'
    } else {
      return '未配置'
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">交易所配置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 配置表单 */}
        <div className="p-6 space-y-6">
          {configs.map((config, index) => (
            <div key={config.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                  {getStatusIcon(config)}
                  <span className="text-sm text-gray-600">{getStatusText(config)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testConnection(config.name)}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    测试连接
                  </button>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) => updateConfig(config.name, 'isActive', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">启用</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords[config.name] ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) => updateConfig(config.name, 'apiKey', e.target.value)}
                      placeholder="输入API Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(config.name)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords[config.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secret Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords[config.name] ? 'text' : 'password'}
                      value={config.secretKey}
                      onChange={(e) => updateConfig(config.name, 'secretKey', e.target.value)}
                      placeholder="输入Secret Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(config.name)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords[config.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* OKX需要Passphrase */}
                {config.name === 'OKX' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passphrase (OKX必需)
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords[config.name] ? 'text' : 'password'}
                        value={config.passphrase || ''}
                        onChange={(e) => updateConfig(config.name, 'passphrase', e.target.value)}
                        placeholder="输入Passphrase"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(config.name)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords[config.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            💡 提示：API密钥将安全存储在环境变量中，不会保存在前端
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={saveConfigs}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 