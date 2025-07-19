interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info'
  text: string
  className?: string
}

export function StatusIndicator({ status, text, className }: StatusIndicatorProps) {
  const statusClasses = {
    success: 'status-success',
    warning: 'status-warning',
    error: 'status-error',
    info: 'status-info'
  }

  return (
    <span className={`status-indicator ${statusClasses[status]} ${className || ''}`}>
      {text}
    </span>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  className?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({ label, value, className, trend }: MetricCardProps) {
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : ''
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : ''

  return (
    <div className={`metric-card ${className || ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {trendIcon && <span className={`ml-1 ${trendColor}`}>{trendIcon}</span>}
      </div>
    </div>
  )
} 