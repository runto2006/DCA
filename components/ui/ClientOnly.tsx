'use client'

import { useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// 时间显示组件 - 避免水合错误
export function TimeDisplay({ 
  date, 
  format = 'time',
  className = '' 
}: { 
  date: Date | null
  format?: 'time' | 'datetime' | 'relative'
  className?: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !date) {
    return <span className={className}>--:--:--</span>
  }

  const formatTime = () => {
    switch (format) {
      case 'datetime':
        return date.toLocaleString()
      case 'relative':
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return '刚刚'
        if (minutes < 60) return `${minutes}分钟前`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}小时前`
        const days = Math.floor(hours / 24)
        return `${days}天前`
      default:
        return date.toLocaleTimeString()
    }
  }

  return <span className={className}>{formatTime()}</span>
}

// 价格显示组件 - 避免水合错误
export function PriceDisplay({ 
  price, 
  symbol = '$',
  decimals = 2,
  className = '' 
}: { 
  price: number | null
  symbol?: string
  decimals?: number
  className?: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || price === null) {
    return <span className={className}>--</span>
  }

  return <span className={className}>{symbol}{price.toFixed(decimals)}</span>
} 