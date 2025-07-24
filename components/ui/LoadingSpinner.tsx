'use client'

import { motion } from 'framer-motion'
import { Loader2, RefreshCw } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  variant?: 'spinner' | 'dots' | 'pulse'
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  variant = 'spinner',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const SpinnerIcon = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ 
        duration: 1, 
        repeat: Infinity, 
        ease: 'linear' 
      }}
      className={sizeClasses[size]}
    >
      <Loader2 className="w-full h-full text-blue-500" />
    </motion.div>
  )

  const DotsIcon = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2
          }}
          className={`${sizeClasses[size]} bg-blue-500 rounded-full`}
        />
      ))}
    </div>
  )

  const PulseIcon = () => (
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{ 
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={`${sizeClasses[size]} bg-blue-500 rounded-full`}
    />
  )

  const getIcon = () => {
    switch (variant) {
      case 'dots':
        return <DotsIcon />
      case 'pulse':
        return <PulseIcon />
      default:
        return <SpinnerIcon />
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      {getIcon()}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

export function RefreshButton({ 
  onClick, 
  loading = false, 
  className = '' 
}: { 
  onClick: () => void
  loading?: boolean
  className?: string
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={loading}
      className={`p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <motion.div
        animate={{ rotate: loading ? 360 : 0 }}
        transition={{ 
          duration: 1, 
          repeat: loading ? Infinity : 0,
          ease: 'linear'
        }}
      >
        <RefreshCw className="w-4 h-4" />
      </motion.div>
    </motion.button>
  )
} 