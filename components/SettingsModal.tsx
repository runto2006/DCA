'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, XCircle, BarChart3 } from 'lucide-react'
import ExchangeSettings from './ExchangeSettings'
import { TradingViewSettings } from './TradingViewSettings'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'exchanges' | 'tradingview'>('exchanges')

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
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('exchanges')}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'exchanges'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>交易所配置</span>
          </button>
          <button
            onClick={() => setActiveTab('tradingview')}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tradingview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>TradingView信号</span>
          </button>
        </div>

        {/* 标签页内容 */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'exchanges' && (
            <div className="p-6">
              <ExchangeSettings isOpen={true} onClose={() => {}} />
            </div>
          )}
          {activeTab === 'tradingview' && (
            <div className="p-6">
              <TradingViewSettings />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
} 