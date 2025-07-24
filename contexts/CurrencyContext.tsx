'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CurrencyContextType {
  currentSymbol: string
  setCurrentSymbol: (symbol: string) => void
  availableSymbols: Array<{symbol: string, name: string}>
  symbolCategory: string
  setSymbolCategory: (category: string) => void
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

interface CurrencyProviderProps {
  children: ReactNode
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currentSymbol, setCurrentSymbol] = useState<string>('SOLUSDT')
  const [availableSymbols, setAvailableSymbols] = useState<Array<{symbol: string, name: string}>>([])
  const [symbolCategory, setSymbolCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // 获取可用的交易对列表
  const fetchAvailableSymbols = async (category: string = 'all') => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/symbols?category=${category}&limit=50`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        // 从API响应中提取symbols数组，并转换为需要的格式
        const symbols = data.data.symbols || []
        const formattedSymbols = symbols.map((item: any) => ({
          symbol: item.symbol,
          name: item.base_asset || item.symbol.replace('USDT', '')
        }))
        setAvailableSymbols(formattedSymbols)
      } else {
        console.error('获取可用币种失败:', data.error)
        // 设置默认币种
        setAvailableSymbols([
          { symbol: 'SOLUSDT', name: 'Solana' },
          { symbol: 'BTCUSDT', name: 'Bitcoin' },
          { symbol: 'ETHUSDT', name: 'Ethereum' },
          { symbol: 'ADAUSDT', name: 'Cardano' },
          { symbol: 'DOTUSDT', name: 'Polkadot' },
          { symbol: 'LINKUSDT', name: 'Chainlink' },
          { symbol: 'UNIUSDT', name: 'Uniswap' },
          { symbol: 'MATICUSDT', name: 'Polygon' }
        ])
      }
    } catch (error) {
      console.error('获取可用币种失败:', error)
      // 设置默认币种
      setAvailableSymbols([
        { symbol: 'SOLUSDT', name: 'Solana' },
        { symbol: 'BTCUSDT', name: 'Bitcoin' },
        { symbol: 'ETHUSDT', name: 'Ethereum' },
        { symbol: 'ADAUSDT', name: 'Cardano' },
        { symbol: 'DOTUSDT', name: 'Polkadot' },
        { symbol: 'LINKUSDT', name: 'Chainlink' },
        { symbol: 'UNIUSDT', name: 'Uniswap' },
        { symbol: 'MATICUSDT', name: 'Polygon' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化时获取币种列表
  useEffect(() => {
    fetchAvailableSymbols()
  }, [])

  // 当分类改变时重新获取币种列表
  useEffect(() => {
    fetchAvailableSymbols(symbolCategory)
  }, [symbolCategory])

  const value: CurrencyContextType = {
    currentSymbol,
    setCurrentSymbol,
    availableSymbols,
    symbolCategory,
    setSymbolCategory,
    isLoading
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
} 