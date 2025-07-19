-- 多币种系统数据库扩展脚本

-- 1. 创建币种配置表
CREATE TABLE IF NOT EXISTS currency_config (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL, -- 币种符号 (SOL, BTC, ETH, etc.)
    name VARCHAR(100) NOT NULL, -- 币种名称
    full_name VARCHAR(200), -- 完整名称
    trading_pair VARCHAR(20) NOT NULL, -- 交易对 (SOLUSDT, BTCUSDT, etc.)
    is_active BOOLEAN DEFAULT true, -- 是否启用
    min_order_amount DECIMAL(20, 8) DEFAULT 10.0, -- 最小订单金额
    max_order_amount DECIMAL(20, 8) DEFAULT 10000.0, -- 最大订单金额
    price_precision INTEGER DEFAULT 8, -- 价格精度
    quantity_precision INTEGER DEFAULT 8, -- 数量精度
    icon_url VARCHAR(500), -- 币种图标URL
    description TEXT, -- 币种描述
    risk_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    volatility_threshold DECIMAL(10, 4) DEFAULT 5.0, -- 波动率阈值
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建币种价格历史表
CREATE TABLE IF NOT EXISTS currency_price_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price_usdt DECIMAL(20, 8) NOT NULL,
    price_btc DECIMAL(20, 8),
    volume_24h DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    price_change_24h DECIMAL(10, 4),
    price_change_7d DECIMAL(10, 4),
    high_24h DECIMAL(20, 8),
    low_24h DECIMAL(20, 8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建币种技术指标表
CREATE TABLE IF NOT EXISTS currency_technical_indicators (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ema_89 DECIMAL(20, 8),
    ema_21 DECIMAL(20, 8),
    ema_7 DECIMAL(20, 8),
    rsi_14 DECIMAL(10, 4),
    macd DECIMAL(20, 8),
    macd_signal DECIMAL(20, 8),
    macd_histogram DECIMAL(20, 8),
    obv DECIMAL(20, 2),
    bollinger_upper DECIMAL(20, 8),
    bollinger_middle DECIMAL(20, 8),
    bollinger_lower DECIMAL(20, 8),
    stoch_k DECIMAL(10, 4),
    stoch_d DECIMAL(10, 4),
    atr DECIMAL(20, 8), -- 平均真实波幅
    volatility DECIMAL(10, 4),
    support_level DECIMAL(20, 8),
    resistance_level DECIMAL(20, 8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建币种策略评分表
CREATE TABLE IF NOT EXISTS currency_strategy_scores (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ema_score INTEGER CHECK (ema_score >= 0 AND ema_score <= 100),
    rsi_score INTEGER CHECK (rsi_score >= 0 AND rsi_score <= 100),
    macd_score INTEGER CHECK (macd_score >= 0 AND macd_score <= 100),
    obv_score INTEGER CHECK (obv_score >= 0 AND obv_score <= 100),
    volatility_score INTEGER CHECK (volatility_score >= 0 AND volatility_score <= 100),
    volume_score INTEGER CHECK (volume_score >= 0 AND volume_score <= 100),
    total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
    recommendation VARCHAR(50), -- 'STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    trend VARCHAR(20), -- 'BULLISH', 'BEARISH', 'SIDEWAYS'
    market_sentiment VARCHAR(20), -- 'POSITIVE', 'NEUTRAL', 'NEGATIVE'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建多币种DCA设置表
CREATE TABLE IF NOT EXISTS multi_currency_dca_settings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    base_amount DECIMAL(20, 8) NOT NULL, -- 基础订单金额
    max_orders INTEGER DEFAULT 6,
    amount_multiplier DECIMAL(10, 4) DEFAULT 1.5, -- 金额递增倍数
    price_deviation DECIMAL(10, 4) DEFAULT 1.5, -- 价格偏离度
    take_profit_percentage DECIMAL(10, 4) DEFAULT 1.2, -- 止盈百分比
    stop_loss_percentage DECIMAL(10, 4) DEFAULT 5.0, -- 止损百分比
    current_order INTEGER DEFAULT 0,
    total_invested DECIMAL(20, 8) DEFAULT 0,
    strategy_type VARCHAR(20) DEFAULT 'BALANCED' CHECK (strategy_type IN ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE')),
    risk_tolerance VARCHAR(10) DEFAULT 'MEDIUM' CHECK (risk_tolerance IN ('LOW', 'MEDIUM', 'HIGH')),
    last_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol)
);

-- 6. 创建多币种持仓表
CREATE TABLE IF NOT EXISTS multi_currency_positions (
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
    trailing_stop_distance DECIMAL(10, 4),
    trailing_stop_price DECIMAL(20, 8),
    highest_price DECIMAL(20, 8),
    lowest_price DECIMAL(20, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 创建多币种交易历史表
CREATE TABLE IF NOT EXISTS multi_currency_trade_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) DEFAULT 'default_user',
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    total_amount DECIMAL(20, 8) NOT NULL,
    fee DECIMAL(20, 8) DEFAULT 0,
    strategy_reason TEXT,
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 创建币种组合配置表
CREATE TABLE IF NOT EXISTS currency_portfolio_config (
    id SERIAL PRIMARY KEY,
    portfolio_name VARCHAR(100) NOT NULL,
    description TEXT,
    target_allocation JSONB NOT NULL, -- {"SOL": 0.4, "BTC": 0.3, "ETH": 0.3}
    rebalance_threshold DECIMAL(10, 4) DEFAULT 5.0, -- 再平衡阈值
    max_single_currency DECIMAL(10, 4) DEFAULT 50.0, -- 单一币种最大比例
    risk_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 插入默认币种配置
INSERT INTO currency_config (symbol, name, full_name, trading_pair, min_order_amount, max_order_amount, risk_level, description) VALUES
('SOL', 'Solana', 'Solana', 'SOLUSDT', 10.0, 10000.0, 'MEDIUM', '高性能区块链平台'),
('BTC', 'Bitcoin', 'Bitcoin', 'BTCUSDT', 10.0, 100000.0, 'LOW', '数字黄金，加密货币之王'),
('ETH', 'Ethereum', 'Ethereum', 'ETHUSDT', 10.0, 50000.0, 'MEDIUM', '智能合约平台'),
('ADA', 'Cardano', 'Cardano', 'ADAUSDT', 10.0, 10000.0, 'MEDIUM', '学术驱动的区块链平台'),
('DOT', 'Polkadot', 'Polkadot', 'DOTUSDT', 10.0, 10000.0, 'MEDIUM', '多链互操作平台'),
('LINK', 'Chainlink', 'Chainlink', 'LINKUSDT', 10.0, 10000.0, 'HIGH', '去中心化预言机网络'),
('MATIC', 'Polygon', 'Polygon', 'MATICUSDT', 10.0, 10000.0, 'HIGH', '以太坊扩展解决方案'),
('AVAX', 'Avalanche', 'Avalanche', 'AVAXUSDT', 10.0, 10000.0, 'HIGH', '高性能智能合约平台'),
('UNI', 'Uniswap', 'Uniswap', 'UNIUSDT', 10.0, 10000.0, 'HIGH', '去中心化交易所代币'),
('ATOM', 'Cosmos', 'Cosmos', 'ATOMUSDT', 10.0, 10000.0, 'MEDIUM', '区块链互联网')
ON CONFLICT (symbol) DO NOTHING;

-- 10. 创建索引
CREATE INDEX IF NOT EXISTS idx_currency_config_symbol ON currency_config(symbol);
CREATE INDEX IF NOT EXISTS idx_currency_config_active ON currency_config(is_active);
CREATE INDEX IF NOT EXISTS idx_currency_price_history_symbol_timestamp ON currency_price_history(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_currency_technical_indicators_symbol_timestamp ON currency_technical_indicators(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_currency_strategy_scores_symbol_timestamp ON currency_strategy_scores(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_multi_currency_dca_settings_symbol ON multi_currency_dca_settings(symbol);
CREATE INDEX IF NOT EXISTS idx_multi_currency_positions_user_symbol ON multi_currency_positions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_multi_currency_trade_history_user_symbol ON multi_currency_trade_history(user_id, symbol);

-- 11. 创建视图
CREATE OR REPLACE VIEW latest_currency_prices AS
SELECT DISTINCT ON (symbol) 
    symbol,
    price_usdt,
    price_btc,
    volume_24h,
    market_cap,
    price_change_24h,
    price_change_7d,
    high_24h,
    low_24h,
    timestamp
FROM currency_price_history
ORDER BY symbol, timestamp DESC;

CREATE OR REPLACE VIEW latest_currency_indicators AS
SELECT DISTINCT ON (symbol) 
    symbol,
    ema_89,
    ema_21,
    ema_7,
    rsi_14,
    macd,
    macd_signal,
    macd_histogram,
    obv,
    bollinger_upper,
    bollinger_middle,
    bollinger_lower,
    stoch_k,
    stoch_d,
    atr,
    volatility,
    support_level,
    resistance_level,
    timestamp
FROM currency_technical_indicators
ORDER BY symbol, timestamp DESC;

CREATE OR REPLACE VIEW latest_currency_scores AS
SELECT DISTINCT ON (symbol) 
    symbol,
    ema_score,
    rsi_score,
    macd_score,
    obv_score,
    volatility_score,
    volume_score,
    total_score,
    recommendation,
    confidence,
    risk_level,
    trend,
    market_sentiment,
    timestamp
FROM currency_strategy_scores
ORDER BY symbol, timestamp DESC;

-- 12. 创建触发器函数
CREATE OR REPLACE FUNCTION update_currency_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. 创建触发器
CREATE TRIGGER trigger_update_currency_config_updated_at
    BEFORE UPDATE ON currency_config
    FOR EACH ROW
    EXECUTE FUNCTION update_currency_tables_updated_at();

CREATE TRIGGER trigger_update_multi_currency_dca_settings_updated_at
    BEFORE UPDATE ON multi_currency_dca_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_currency_tables_updated_at();

CREATE TRIGGER trigger_update_multi_currency_positions_updated_at
    BEFORE UPDATE ON multi_currency_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_currency_tables_updated_at();

-- 14. 创建函数：计算币种组合价值
CREATE OR REPLACE FUNCTION calculate_portfolio_value(user_id_param VARCHAR(255))
RETURNS TABLE (
    symbol VARCHAR(20),
    quantity DECIMAL(20, 8),
    current_price DECIMAL(20, 8),
    total_value DECIMAL(20, 8),
    percentage DECIMAL(10, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.symbol,
        p.quantity,
        cp.price_usdt as current_price,
        p.quantity * cp.price_usdt as total_value,
        (p.quantity * cp.price_usdt / SUM(p.quantity * cp.price_usdt) OVER()) * 100 as percentage
    FROM multi_currency_positions p
    JOIN latest_currency_prices cp ON p.symbol = cp.symbol
    WHERE p.user_id = user_id_param AND p.status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql;

-- 15. 创建函数：获取币种推荐列表
CREATE OR REPLACE FUNCTION get_currency_recommendations(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    symbol VARCHAR(20),
    name VARCHAR(100),
    total_score INTEGER,
    recommendation VARCHAR(50),
    risk_level VARCHAR(10),
    current_price DECIMAL(20, 8),
    price_change_24h DECIMAL(10, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.symbol,
        cc.name,
        cs.total_score,
        cs.recommendation,
        cs.risk_level,
        cp.price_usdt as current_price,
        cp.price_change_24h
    FROM currency_config cc
    JOIN latest_currency_scores cs ON cc.symbol = cs.symbol
    JOIN latest_currency_prices cp ON cc.symbol = cp.symbol
    WHERE cc.is_active = true
    ORDER BY cs.total_score DESC, cs.confidence DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 