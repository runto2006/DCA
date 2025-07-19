-- 数据库结构更新SQL
-- 用于修复DCA系统所需的表结构

-- 1. 为trade_history表添加notes字段
ALTER TABLE trade_history ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. 创建tvl_data表
CREATE TABLE IF NOT EXISTS tvl_data (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(50) NOT NULL,
  tvl DECIMAL(20,2) NOT NULL,
  tvl_change_1d DECIMAL(10,4),
  tvl_change_7d DECIMAL(10,4),
  tvl_change_30d DECIMAL(10,4),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建tvl_history表
CREATE TABLE IF NOT EXISTS tvl_history (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(50) NOT NULL,
  date BIGINT NOT NULL,
  tvl DECIMAL(20,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建positions表
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  entry_price DECIMAL(20,8) NOT NULL,
  current_price DECIMAL(20,8),
  pnl DECIMAL(20,2),
  status VARCHAR(20) DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 5. 为user_positions表添加移动止盈字段
ALTER TABLE user_positions ADD COLUMN IF NOT EXISTS trailing_stop_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_positions ADD COLUMN IF NOT EXISTS trailing_stop_distance DECIMAL(10, 4);
ALTER TABLE user_positions ADD COLUMN IF NOT EXISTS trailing_stop_price DECIMAL(20, 8);
ALTER TABLE user_positions ADD COLUMN IF NOT EXISTS highest_price DECIMAL(20, 8);
ALTER TABLE user_positions ADD COLUMN IF NOT EXISTS lowest_price DECIMAL(20, 8);

-- 6. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_history_timestamp ON trade_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_tvl_data_chain ON tvl_data(chain);
CREATE INDEX IF NOT EXISTS idx_tvl_data_timestamp ON tvl_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_user_positions_trailing_stop ON user_positions(trailing_stop_enabled, status);

-- 7. 添加注释
COMMENT ON TABLE tvl_data IS 'TVL数据表，存储各链的TVL信息';
COMMENT ON TABLE tvl_history IS 'TVL历史数据表，存储TVL历史变化';
COMMENT ON TABLE positions IS '持仓表，存储用户持仓信息';
COMMENT ON COLUMN user_positions.trailing_stop_enabled IS '是否启用移动止盈';
COMMENT ON COLUMN user_positions.trailing_stop_distance IS '移动止盈距离（百分比）';
COMMENT ON COLUMN user_positions.trailing_stop_price IS '当前移动止盈价格';
COMMENT ON COLUMN user_positions.highest_price IS '持仓期间最高价格';
COMMENT ON COLUMN user_positions.lowest_price IS '持仓期间最低价格';
COMMENT ON COLUMN trade_history.notes IS '交易备注信息'; 