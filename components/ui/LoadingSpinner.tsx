interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex items-center justify-center ${className || ''}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
      {text && <span className="ml-3 text-gray-500">{text}</span>}
    </div>
  )
}

export function LoadingCard({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  )
} 