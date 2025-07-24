const { Pool } = require('pg')

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'solbtc_dca',
  user: process.env.DB_USER || 'solbtc_user',
  password: process.env.DB_PASSWORD || 'runto2015',
}

// 数据库表结构SQL
const databaseSchema = `
-- 用户持仓表
CREATE TABLE IF NOT EXISTS user_positions (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
  entry_price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  total_amount DECIMAL(20,8) NOT NULL,
  exit_price DECIMAL(20,8),
  exit_date TIMESTAMP,
  pnl DECIMAL(20,8),
  pnl_percentage DECIMAL(10,4),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  user_id VARCHAR(100) DEFAULT 'default_user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- 移动止盈相关字段
  trailing_stop_enabled BOOLEAN DEFAULT FALSE,
  trailing_stop_distance DECIMAL(5,2),
  trailing_stop_price DECIMAL(20,8),
  highest_price DECIMAL(20,8),
  lowest_price DECIMAL(20,8)
);

-- 交易历史表
CREATE TABLE IF NOT EXISTS trade_history (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  total_amount DECIMAL(20,8) NOT NULL,
  strategy_reason VARCHAR(200),
  user_id VARCHAR(100) DEFAULT 'default_user',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 价格数据表
CREATE TABLE IF NOT EXISTS price_data (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  volume DECIMAL(20,8),
  market_cap DECIMAL(20,8),
  price_change_24h DECIMAL(10,4),
  volume_change_24h DECIMAL(10,4),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 技术指标表
CREATE TABLE IF NOT EXISTS technical_indicators (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  ema_89 DECIMAL(20,8),
  rsi DECIMAL(10,4),
  obv DECIMAL(20,8),
  macd DECIMAL(20,8),
  macd_signal DECIMAL(20,8),
  macd_histogram DECIMAL(20,8),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 策略评分表
CREATE TABLE IF NOT EXISTS strategy_scores (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  ema_score INTEGER CHECK (ema_score >= 0 AND ema_score <= 100),
  rsi_score INTEGER CHECK (rsi_score >= 0 AND rsi_score <= 100),
  obv_score INTEGER CHECK (obv_score >= 0 AND obv_score <= 100),
  macd_score INTEGER CHECK (macd_score >= 0 AND macd_score <= 100),
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
  recommendation VARCHAR(20) CHECK (recommendation IN ('BUY', 'SELL', 'HOLD')),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- TVL数据表
CREATE TABLE IF NOT EXISTS tvl_data (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(50) NOT NULL,
  tvl DECIMAL(20,2) NOT NULL,
  tvl_change_1d DECIMAL(10,4),
  tvl_change_7d DECIMAL(10,4),
  tvl_change_30d DECIMAL(10,4),
  protocols_count INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 多币种配置表
CREATE TABLE IF NOT EXISTS multi_currency_config (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 多币种DCA设置表
CREATE TABLE IF NOT EXISTS multi_currency_dca_settings (
  id SERIAL PRIMARY KEY,
  currency_symbol VARCHAR(20) UNIQUE NOT NULL,
  base_amount DECIMAL(20,8) NOT NULL,
  max_orders INTEGER DEFAULT 5,
  price_deviation DECIMAL(5,2) DEFAULT 2.0,
  take_profit DECIMAL(5,2) DEFAULT 1.5,
  amount_multiplier DECIMAL(5,2) DEFAULT 1.2,
  deviation_multiplier DECIMAL(5,2) DEFAULT 1.1,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_positions_symbol ON user_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_user_positions_status ON user_positions(status);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_history_timestamp ON trade_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_data_symbol ON price_data(symbol);
CREATE INDEX IF NOT EXISTS idx_price_data_timestamp ON price_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol ON technical_indicators(symbol);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_timestamp ON technical_indicators(timestamp);
CREATE INDEX IF NOT EXISTS idx_strategy_scores_symbol ON strategy_scores(symbol);
CREATE INDEX IF NOT EXISTS idx_strategy_scores_timestamp ON strategy_scores(timestamp);
CREATE INDEX IF NOT EXISTS idx_tvl_data_chain ON tvl_data(chain);
CREATE INDEX IF NOT EXISTS idx_tvl_data_timestamp ON tvl_data(timestamp);
`;

async function initDatabase() {
  console.log('🚀 开始初始化本地数据库...')
  
  const pool = new Pool(dbConfig)
  
  try {
    // 测试连接
    console.log('🔍 测试数据库连接...')
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    console.log('✅ 数据库连接成功:', result.rows[0])
    client.release()
    
    // 执行数据库结构SQL
    console.log('📖 创建数据库表结构...')
    const sqlStatements = databaseSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 找到 ${sqlStatements.length} 条SQL语句`)
    
    // 执行SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i]
      if (sql.trim()) {
        try {
          console.log(`📝 执行SQL语句 ${i + 1}/${sqlStatements.length}...`)
          await pool.query(sql)
          console.log(`✅ SQL语句 ${i + 1} 执行成功`)
        } catch (error) {
          console.error(`❌ SQL语句 ${i + 1} 执行失败:`, error.message)
          // 继续执行其他语句
        }
      }
    }
    
    // 验证表结构
    console.log('🔍 验证数据库表结构...')
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('📋 已创建的表:')
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // 插入初始数据
    console.log('📝 插入初始数据...')
    await insertInitialData(pool)
    
    console.log('🎉 数据库初始化完成！')
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  } finally {
    await pool.end()
  }
}

async function insertInitialData(pool) {
  // 插入多币种配置
  const currencies = [
    { symbol: 'SOL', name: 'Solana', enabled: true, priority: 1 },
    { symbol: 'BTC', name: 'Bitcoin', enabled: true, priority: 2 },
    { symbol: 'ETH', name: 'Ethereum', enabled: true, priority: 3 },
    { symbol: 'ADA', name: 'Cardano', enabled: true, priority: 4 },
    { symbol: 'DOT', name: 'Polkadot', enabled: true, priority: 5 },
    { symbol: 'LINK', name: 'Chainlink', enabled: true, priority: 6 },
    { symbol: 'MATIC', name: 'Polygon', enabled: true, priority: 7 },
    { symbol: 'AVAX', name: 'Avalanche', enabled: true, priority: 8 },
    { symbol: 'UNI', name: 'Uniswap', enabled: true, priority: 9 },
    { symbol: 'ATOM', name: 'Cosmos', enabled: true, priority: 10 }
  ]
  
  for (const currency of currencies) {
    try {
      await pool.query(`
        INSERT INTO multi_currency_config (symbol, name, enabled, priority, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          enabled = EXCLUDED.enabled,
          priority = EXCLUDED.priority,
          updated_at = NOW()
      `, [currency.symbol, currency.name, currency.enabled, currency.priority])
      console.log(`✅ 插入币种配置: ${currency.symbol}`)
    } catch (error) {
      console.error(`❌ 插入币种配置失败 ${currency.symbol}:`, error.message)
    }
  }
  
  // 插入默认DCA设置
  try {
    await pool.query(`
      INSERT INTO multi_currency_dca_settings (
        currency_symbol, base_amount, max_orders, price_deviation, 
        take_profit, amount_multiplier, deviation_multiplier, enabled, created_at, updated_at
      )
      VALUES 
        ('SOL', 50, 5, 2.0, 1.5, 1.2, 1.1, false, NOW(), NOW()),
        ('BTC', 100, 3, 1.5, 1.2, 1.5, 1.2, false, NOW(), NOW()),
        ('ETH', 80, 4, 1.8, 1.3, 1.3, 1.1, false, NOW(), NOW())
      ON CONFLICT (currency_symbol) DO NOTHING
    `)
    console.log('✅ 插入默认DCA设置')
  } catch (error) {
    console.error('❌ 插入DCA设置失败:', error.message)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ 数据库初始化脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 数据库初始化脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { initDatabase } 