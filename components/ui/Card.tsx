import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ 
  children, 
  className = '', 
  hover = false, 
  interactive = false,
  padding = 'md'
}: CardProps) {
  const baseClasses = 'card'
  const hoverClasses = hover ? 'card-hover' : ''
  const interactiveClasses = interactive ? 'card-interactive' : ''
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${interactiveClasses} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 ${className}`}>
      {children}
    </div>
  )
} 