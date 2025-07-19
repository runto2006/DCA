import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  className?: string
}

interface ContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

interface SectionProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 ${className || ''}`}>
      {children}
    </div>
  )
}

export function Container({ children, className, maxWidth = 'xl' }: ContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  }

  return (
    <div className={`container mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClasses[maxWidth]} ${className || ''}`}>
      {children}
    </div>
  )
}

export function Section({ children, className, title, subtitle }: SectionProps) {
  return (
    <section className={`py-8 ${className || ''}`}>
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export function Grid({ children, className, cols = 1 }: { children: ReactNode, className?: string, cols?: 1 | 2 | 3 | 4 }) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  return (
    <div className={`grid ${gridCols[cols]} gap-6 ${className || ''}`}>
      {children}
    </div>
  )
} 