-- TradingView信号相关表结构

-- 创建TradingView信号记录表
CREATE TABLE IF NOT EXISTS tradingview_signals (
  id SERIAL PRIMARY KEY,
  original_signal JSONB NOT NULL,           -- 原始信号数据
  trade_signal JSONB NOT NULL,              -- 解析后的交易信号
  risk_check JSONB NOT NULL,                -- 风险检查结果
  execution_result JSONB,                   -- 执行结果（可能为空）
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 状态：PENDING, EXECUTED, REJECTED, FAILED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tradingview_signals_status ON tradingview_signals(status);
CREATE INDEX IF NOT EXISTS idx_tradingview_signals_created_at ON tradingview_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_tradingview_signals_symbol ON tradingview_signals((trade_signal->>'symbol'));

-- 创建TradingView配置表
CREATE TABLE IF NOT EXISTS tradingview_config (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,            -- 是否启用
  webhook_url VARCHAR(500),                 -- Webhook URL
  secret_key VARCHAR(255),                  -- 密钥
  default_exchange VARCHAR(50) DEFAULT 'binance', -- 默认交易所
  exchange_priority JSONB DEFAULT '["binance", "okx", "bybit", "gate"]', -- 交易所优先级
  max_daily_loss DECIMAL(15,2) DEFAULT 1000.00, -- 最大日亏损
  max_position_size DECIMAL(5,4) DEFAULT 0.1000, -- 最大仓位比例
  min_confidence INTEGER DEFAULT 70,        -- 最小可信度
  max_leverage INTEGER DEFAULT 5,           -- 最大杠杆
  allowed_strategies JSONB DEFAULT '[]',    -- 允许的策略
  blocked_symbols JSONB DEFAULT '[]',       -- 屏蔽的交易对
  trading_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "timezone": "Asia/Shanghai"}', -- 交易时间
  notifications JSONB DEFAULT '{"email": false, "telegram": false, "webhook": false}', -- 通知设置
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO tradingview_config (
  enabled, 
  webhook_url, 
  secret_key,
  default_exchange,
  exchange_priority,
  max_daily_loss,
  max_position_size,
  min_confidence,
  max_leverage,
  allowed_strategies,
  blocked_symbols,
  trading_hours,
  notifications
) VALUES (
  false,
  '',
  '',
  'binance',
  '["binance", "okx", "bybit", "gate"]',
  1000.00,
  0.1000,
  70,
  5,
  '[]',
  '[]',
  '{"start": "09:00", "end": "17:00", "timezone": "Asia/Shanghai"}',
  '{"email": false, "telegram": false, "webhook": false}'
) ON CONFLICT DO NOTHING;

-- 创建TradingView信号统计表
CREATE TABLE IF NOT EXISTS tradingview_statistics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,                -- 日期
  total_signals INTEGER DEFAULT 0,          -- 总信号数
  executed_signals INTEGER DEFAULT 0,       -- 执行信号数
  rejected_signals INTEGER DEFAULT 0,       -- 拒绝信号数
  failed_signals INTEGER DEFAULT 0,         -- 失败信号数
  total_pnl DECIMAL(15,2) DEFAULT 0.00,     -- 总盈亏
  win_rate DECIMAL(5,2) DEFAULT 0.00,       -- 胜率
  avg_confidence DECIMAL(5,2) DEFAULT 0.00, -- 平均可信度
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tradingview_statistics_date ON tradingview_statistics(date);

-- 创建触发器函数，用于更新统计信息
CREATE OR REPLACE FUNCTION update_tradingview_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新当天的统计信息
  INSERT INTO tradingview_statistics (
    date,
    total_signals,
    executed_signals,
    rejected_signals,
    failed_signals,
    total_pnl,
    win_rate,
    avg_confidence,
    updated_at
  )
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_signals,
    COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executed_signals,
    COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_signals,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_signals,
    COALESCE(SUM(
      CASE 
        WHEN status = 'EXECUTED' AND execution_result IS NOT NULL 
        THEN (execution_result->>'pnl')::DECIMAL(15,2)
        ELSE 0
      END
    ), 0) as total_pnl,
    CASE 
      WHEN COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) > 0 
      THEN ROUND(
        COUNT(CASE WHEN status = 'EXECUTED' AND (execution_result->>'pnl')::DECIMAL(15,2) > 0 THEN 1 END)::DECIMAL(5,2) / 
        COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END)::DECIMAL(5,2) * 100, 2
      )
      ELSE 0
    END as win_rate,
    ROUND(AVG((trade_signal->>'confidence')::DECIMAL(5,2)), 2) as avg_confidence,
    NOW() as updated_at
  FROM tradingview_signals
  WHERE DATE(created_at) = DATE(NEW.created_at)
  GROUP BY DATE(created_at)
  ON CONFLICT (date) DO UPDATE SET
    total_signals = EXCLUDED.total_signals,
    executed_signals = EXCLUDED.executed_signals,
    rejected_signals = EXCLUDED.rejected_signals,
    failed_signals = EXCLUDED.failed_signals,
    total_pnl = EXCLUDED.total_pnl,
    win_rate = EXCLUDED.win_rate,
    avg_confidence = EXCLUDED.avg_confidence,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_tradingview_statistics ON tradingview_signals;
CREATE TRIGGER trigger_update_tradingview_statistics
  AFTER INSERT OR UPDATE ON tradingview_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_tradingview_statistics();

-- 创建视图，用于查看信号统计
CREATE OR REPLACE VIEW tradingview_dashboard AS
SELECT 
  ts.date,
  ts.total_signals,
  ts.executed_signals,
  ts.rejected_signals,
  ts.failed_signals,
  ts.total_pnl,
  ts.win_rate,
  ts.avg_confidence,
  -- 计算成功率
  CASE 
    WHEN ts.total_signals > 0 
    THEN ROUND((ts.executed_signals::DECIMAL(5,2) / ts.total_signals::DECIMAL(5,2)) * 100, 2)
    ELSE 0
  END as execution_rate,
  -- 计算拒绝率
  CASE 
    WHEN ts.total_signals > 0 
    THEN ROUND((ts.rejected_signals::DECIMAL(5,2) / ts.total_signals::DECIMAL(5,2)) * 100, 2)
    ELSE 0
  END as rejection_rate
FROM tradingview_statistics ts
ORDER BY ts.date DESC;

-- 创建视图，用于查看最近的信号
CREATE OR REPLACE VIEW tradingview_recent_signals AS
SELECT 
  id,
  (trade_signal->>'symbol') as symbol,
  (trade_signal->>'action') as action,
  (trade_signal->>'strategy') as strategy,
  (trade_signal->>'confidence')::INTEGER as confidence,
  status,
  created_at,
  (risk_check->>'riskScore')::INTEGER as risk_score,
  CASE 
    WHEN execution_result IS NOT NULL 
    THEN (execution_result->>'success')::BOOLEAN
    ELSE NULL
  END as execution_success
FROM tradingview_signals
ORDER BY created_at DESC
LIMIT 100; 