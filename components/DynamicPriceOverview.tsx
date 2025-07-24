'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

interface PriceInfo {
  symbol: string
  price: number
  change: number
  name: string
}

export function DynamicPriceOverview() {
  const { currentSymbol, availableSymbols } = useCurrency()
  const [prices, setPrices] = useState<PriceInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 获取多个币种的价格数据
  const fetchPrices = async () => {
    try {
      setIsLoading(true)
      const symbols = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT']
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(`/api/price?symbol=${symbol}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            // 模拟价格变化
            const change = (Math.random() - 0.5) * 10 // -5% 到 +5%
            return {
              symbol: symbol.replace('USDT', ''),
              price: result.data.price,
              change: change,
              name: getSymbolName(symbol)
            }
          }
          return null
        } catch (error) {
          console.error(`获取 ${symbol} 价格失败:`, error)
          return null
        }
      })

      const results = await Promise.all(pricePromises)
      const validPrices = results.filter(Boolean) as PriceInfo[]
      
      // 如果没有获取到数据，使用默认数据
      if (validPrices.length === 0) {
        setPrices([
          { symbol: 'SOL', price: 190.82, change: 2.5, name: 'Solana' },
          { symbol: 'BTC', price: 43250.50, change: -1.2, name: 'Bitcoin' },
          { symbol: 'ETH', price: 2650.75, change: 0.8, name: 'Ethereum' }
        ])
      } else {
        setPrices(validPrices)
      }
    } catch (error) {
      console.error('获取价格数据失败:', error)
      // 使用默认数据
      setPrices([
        { symbol: 'SOL', price: 190.82, change: 2.5, name: 'Solana' },
        { symbol: 'BTC', price: 43250.50, change: -1.2, name: 'Bitcoin' },
        { symbol: 'ETH', price: 2650.75, change: 0.8, name: 'Ethereum' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const getSymbolName = (symbol: string): string => {
    const symbolInfo = availableSymbols.find(s => s.symbol === symbol)
    return symbolInfo?.name || symbol.replace('USDT', '')
  }

  // 初始加载和币种变化时获取数据
  useEffect(() => {
    fetchPrices()
  }, [currentSymbol])

  const getGradientClass = (symbol: string) => {
    switch (symbol) {
      case 'SOL':
        return 'bg-gradient-to-r from-blue-500 to-blue-600'
      case 'BTC':
        return 'bg-gradient-to-r from-orange-500 to-orange-600'
      case 'ETH':
        return 'bg-gradient-to-r from-purple-500 to-purple-600'
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {prices.map((priceInfo, index) => (
        <motion.div
          key={priceInfo.symbol}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`${getGradientClass(priceInfo.symbol)} text-white rounded-lg p-4 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white/80">
                {priceInfo.name}
              </h4>
              <p className="text-xl font-bold text-white">
                ${priceInfo.price.toFixed(2)}
              </p>
            </div>
            <div className={`flex items-center space-x-1 ${
              priceInfo.change >= 0 ? 'text-green-200' : 'text-red-200'
            }`}>
              {priceInfo.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {priceInfo.change >= 0 ? '+' : ''}{priceInfo.change.toFixed(2)}%
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
} 