const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'solbtc_dca',
  user: process.env.DB_USER || 'solbtc_user',
  password: process.env.DB_PASSWORD || 'runto2015'
})

const createTablesSQL = `
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
`

async function createTradingViewTables() {
  try {
    console.log('🔧 开始创建TradingView相关表...')
    
    const client = await pool.connect()
    
    try {
      // 执行SQL语句
      await client.query(createTablesSQL)
      
      console.log('✅ TradingView表创建成功！')
      
      // 验证表是否创建成功
      const tables = ['tradingview_signals', 'tradingview_config', 'tradingview_statistics']
      
      for (const table of tables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table])
        
        if (result.rows[0].exists) {
          console.log(`✅ 表 ${table} 创建成功`)
        } else {
          console.log(`❌ 表 ${table} 创建失败`)
        }
      }
      
      // 检查默认配置
      const configResult = await client.query('SELECT * FROM tradingview_config LIMIT 1')
      if (configResult.rows.length > 0) {
        console.log('✅ 默认配置已插入')
      } else {
        console.log('❌ 默认配置插入失败')
      }
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ 创建TradingView表失败:', error)
  } finally {
    await pool.end()
  }
}

// 运行脚本
if (require.main === module) {
  createTradingViewTables()
}

module.exports = { createTradingViewTables } 