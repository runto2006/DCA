-- 创建价格数据表
CREATE TABLE IF NOT EXISTS price_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    volume_24h DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建技术指标数据表
CREATE TABLE IF NOT EXISTS technical_indicators (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ema_89 DECIMAL(20, 8),
    obv DECIMAL(20, 2),
    rsi DECIMAL(10, 4),
    macd DECIMAL(20, 8),
    macd_signal DECIMAL(20, 8),
    macd_histogram DECIMAL(20, 8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建策略评分表
CREATE TABLE IF NOT EXISTS strategy_scores (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ema_score INTEGER CHECK (ema_score >= 0 AND ema_score <= 100),
    obv_score INTEGER CHECK (obv_score >= 0 AND obv_score <= 100),
    rsi_score INTEGER CHECK (rsi_score >= 0 AND rsi_score <= 100),
    macd_score INTEGER CHECK (macd_score >= 0 AND macd_score <= 100),
    total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
    recommendation VARCHAR(50), -- 'BUY', 'HOLD', 'SELL'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户持仓表
CREATE TABLE IF NOT EXISTS user_positions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT 'default_user',
    symbol VARCHAR(20) NOT NULL,
    position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
    entry_price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_price DECIMAL(20, 8),
    exit_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    pnl DECIMAL(20, 8),
    pnl_percentage DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS trade_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT 'default_user',
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    total_amount DECIMAL(20, 8) NOT NULL,
    strategy_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('ema_period', '89', 'EMA计算周期'),
('rsi_period', '14', 'RSI计算周期'),
('macd_fast', '12', 'MACD快线周期'),
('macd_slow', '26', 'MACD慢线周期'),
('macd_signal', '9', 'MACD信号线周期'),
('min_buy_score', '70', '最低买入评分'),
('max_sell_score', '30', '最高卖出评分')
ON CONFLICT (config_key) DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_price_data_symbol_timestamp ON price_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_timestamp ON technical_indicators(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_strategy_scores_symbol_timestamp ON strategy_scores(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id_status ON user_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_history_user_id_timestamp ON trade_history(user_id, timestamp);

-- 创建视图：最新价格数据
CREATE OR REPLACE VIEW latest_price_data AS
SELECT DISTINCT ON (symbol) 
    symbol,
    price,
    volume_24h,
    market_cap,
    timestamp
FROM price_data
ORDER BY symbol, timestamp DESC;

-- 创建视图：最新技术指标
CREATE OR REPLACE VIEW latest_technical_indicators AS
SELECT DISTINCT ON (symbol) 
    symbol,
    ema_89,
    obv,
    rsi,
    macd,
    macd_signal,
    macd_histogram,
    timestamp
FROM technical_indicators
ORDER BY symbol, timestamp DESC;

-- 创建视图：最新策略评分
CREATE OR REPLACE VIEW latest_strategy_scores AS
SELECT DISTINCT ON (symbol) 
    symbol,
    ema_score,
    obv_score,
    rsi_score,
    macd_score,
    total_score,
    recommendation,
    timestamp
FROM strategy_scores
ORDER BY symbol, timestamp DESC;

-- 创建函数：更新持仓的PNL
CREATE OR REPLACE FUNCTION update_position_pnl()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exit_price IS NOT NULL AND NEW.status = 'CLOSED' THEN
        IF NEW.position_type = 'LONG' THEN
            NEW.pnl := (NEW.exit_price - NEW.entry_price) * NEW.quantity;
            NEW.pnl_percentage := ((NEW.exit_price - NEW.entry_price) / NEW.entry_price) * 100;
        ELSE
            NEW.pnl := (NEW.entry_price - NEW.exit_price) * NEW.quantity;
            NEW.pnl_percentage := ((NEW.entry_price - NEW.exit_price) / NEW.entry_price) * 100;
        END IF;
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_position_pnl
    BEFORE UPDATE ON user_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_position_pnl(); 