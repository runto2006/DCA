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

-- 创建TVL数据表
CREATE TABLE IF NOT EXISTS tvl_data (
    id SERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    tvl DECIMAL(20, 2) NOT NULL,
    tvl_change_1d DECIMAL(10, 4),
    tvl_change_7d DECIMAL(10, 4),
    tvl_change_30d DECIMAL(10, 4),
    protocols_count INTEGER DEFAULT 0,
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
    recommendation VARCHAR(50), -- 'STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    trend VARCHAR(20),
    support DECIMAL(20, 8),
    resistance DECIMAL(20, 8),
    volatility DECIMAL(10, 4),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户持仓表（增强版）
CREATE TABLE IF NOT EXISTS user_positions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT 'default_user',
    symbol VARCHAR(20) NOT NULL,
    position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
    entry_price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    total_amount DECIMAL(20, 8) NOT NULL,
    stop_loss DECIMAL(20, 8),
    take_profit DECIMAL(20, 8),
    strategy_reason TEXT,
    notes TEXT,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_price DECIMAL(20, 8),
    exit_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    pnl DECIMAL(20, 8),
    pnl_percentage DECIMAL(10, 4),
    -- 移动止盈相关字段
    trailing_stop_enabled BOOLEAN DEFAULT FALSE,
    trailing_stop_distance DECIMAL(10, 4), -- 移动止损距离（百分比）
    trailing_stop_price DECIMAL(20, 8), -- 当前移动止损价格
    highest_price DECIMAL(20, 8), -- 持仓期间最高价格
    lowest_price DECIMAL(20, 8), -- 持仓期间最低价格
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建交易记录表（增强版）
CREATE TABLE IF NOT EXISTS trade_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT 'default_user',
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    total_amount DECIMAL(20, 8) NOT NULL,
    strategy_reason TEXT,
    notes TEXT,
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
('max_sell_score', '30', '最高卖出评分'),
('default_stop_loss_percentage', '5', '默认止损百分比'),
('default_take_profit_percentage', '10', '默认止盈百分比'),
('max_position_size_percentage', '20', '最大持仓比例'),
('risk_management_enabled', 'true', '是否启用风险管理')
ON CONFLICT (config_key) DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_price_data_symbol_timestamp ON price_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_timestamp ON technical_indicators(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_tvl_data_chain_timestamp ON tvl_data(chain, timestamp);
CREATE INDEX IF NOT EXISTS idx_strategy_scores_symbol_timestamp ON strategy_scores(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id_status ON user_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_positions_symbol_status ON user_positions(symbol, status);
CREATE INDEX IF NOT EXISTS idx_trade_history_user_id_timestamp ON trade_history(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol_timestamp ON trade_history(symbol, timestamp);

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

-- 创建视图：最新TVL数据
CREATE OR REPLACE VIEW latest_tvl_data AS
SELECT DISTINCT ON (chain) 
    chain,
    tvl,
    tvl_change_1d,
    tvl_change_7d,
    tvl_change_30d,
    protocols_count,
    timestamp
FROM tvl_data
ORDER BY chain, timestamp DESC;

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
    confidence,
    risk_level,
    trend,
    support,
    resistance,
    volatility,
    timestamp
FROM strategy_scores
ORDER BY symbol, timestamp DESC;

-- 创建视图：活跃持仓统计
CREATE OR REPLACE VIEW active_positions_summary AS
SELECT 
    user_id,
    symbol,
    COUNT(*) as position_count,
    SUM(total_amount) as total_value,
    AVG(entry_price) as avg_entry_price,
    SUM(quantity) as total_quantity,
    MIN(entry_date) as first_entry,
    MAX(entry_date) as last_entry
FROM user_positions
WHERE status = 'ACTIVE'
GROUP BY user_id, symbol;

-- 创建视图：交易统计
CREATE OR REPLACE VIEW trade_statistics AS
SELECT 
    user_id,
    symbol,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN trade_type = 'BUY' THEN 1 END) as buy_trades,
    COUNT(CASE WHEN trade_type = 'SELL' THEN 1 END) as sell_trades,
    SUM(total_amount) as total_volume,
    AVG(price) as avg_price,
    MIN(timestamp) as first_trade,
    MAX(timestamp) as last_trade
FROM trade_history
GROUP BY user_id, symbol;

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

-- 创建函数：计算持仓总价值
CREATE OR REPLACE FUNCTION calculate_position_total_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.entry_price * NEW.quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：检查止损止盈
CREATE OR REPLACE FUNCTION check_stop_loss_take_profit()
RETURNS TRIGGER AS $$
DECLARE
    current_price DECIMAL(20, 8);
BEGIN
    -- 获取当前价格（这里需要根据实际情况实现）
    -- SELECT price INTO current_price FROM latest_price_data WHERE symbol = NEW.symbol;
    
    -- 检查止损
    IF NEW.stop_loss IS NOT NULL AND current_price <= NEW.stop_loss AND NEW.status = 'ACTIVE' THEN
        NEW.exit_price := NEW.stop_loss;
        NEW.exit_date := NOW();
        NEW.status := 'CLOSED';
        NEW.pnl := (NEW.exit_price - NEW.entry_price) * NEW.quantity;
        NEW.pnl_percentage := ((NEW.exit_price - NEW.entry_price) / NEW.entry_price) * 100;
        NEW.updated_at := NOW();
    END IF;
    
    -- 检查止盈
    IF NEW.take_profit IS NOT NULL AND current_price >= NEW.take_profit AND NEW.status = 'ACTIVE' THEN
        NEW.exit_price := NEW.take_profit;
        NEW.exit_date := NOW();
        NEW.status := 'CLOSED';
        NEW.pnl := (NEW.exit_price - NEW.entry_price) * NEW.quantity;
        NEW.pnl_percentage := ((NEW.exit_price - NEW.entry_price) / NEW.entry_price) * 100;
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

CREATE TRIGGER trigger_calculate_total_amount
    BEFORE INSERT OR UPDATE ON user_positions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_position_total_amount();

-- 注意：止损止盈检查触发器需要在实际价格更新时触发
-- CREATE TRIGGER trigger_check_stop_loss_take_profit
--     AFTER UPDATE ON latest_price_data
--     FOR EACH ROW
--     EXECUTE FUNCTION check_stop_loss_take_profit(); 