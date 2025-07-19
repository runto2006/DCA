require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// 配置检查
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue')
}

// 所有币种的测试数据
const ALL_CURRENCY_DATA = [
  {
    symbol: 'SOL',
    price: 150.25,
    volume: 2500000000,
    marketCap: 65000000000,
    change24h: 2.5,
    change7d: 8.3,
    high24h: 155.00,
    low24h: 148.50,
    ema89: 145.20,
    ema21: 148.50,
    ema7: 151.80,
    rsi: 65.5,
    macd: 2.5,
    macdSignal: 1.8,
    macdHistogram: 0.7,
    obv: 1250000000,
    volatility: 3.2,
    emaScore: 75,
    rsiScore: 65,
    macdScore: 80,
    obvScore: 70,
    volatilityScore: 60,
    volumeScore: 85,
    totalScore: 72,
    recommendation: 'BUY',
    confidence: 75,
    riskLevel: 'MEDIUM',
    trend: 'BULLISH',
    marketSentiment: 'POSITIVE'
  },
  {
    symbol: 'BTC',
    price: 45000.00,
    volume: 28000000000,
    marketCap: 850000000000,
    change24h: 1.2,
    change7d: 3.8,
    high24h: 45200.00,
    low24h: 44500.00,
    ema89: 44000.00,
    ema21: 44800.00,
    ema7: 45100.00,
    rsi: 58.2,
    macd: 150.0,
    macdSignal: 120.0,
    macdHistogram: 30.0,
    obv: 8500000000,
    volatility: 2.1,
    emaScore: 85,
    rsiScore: 58,
    macdScore: 70,
    obvScore: 80,
    volatilityScore: 75,
    volumeScore: 90,
    totalScore: 76,
    recommendation: 'HOLD',
    confidence: 80,
    riskLevel: 'LOW',
    trend: 'NEUTRAL',
    marketSentiment: 'NEUTRAL'
  },
  {
    symbol: 'ETH',
    price: 3200.00,
    volume: 15000000000,
    marketCap: 380000000000,
    change24h: 0.8,
    change7d: 2.1,
    high24h: 3220.00,
    low24h: 3180.00,
    ema89: 3150.00,
    ema21: 3180.00,
    ema7: 3205.00,
    rsi: 52.8,
    macd: 25.0,
    macdSignal: 20.0,
    macdHistogram: 5.0,
    obv: 4200000000,
    volatility: 1.8,
    emaScore: 70,
    rsiScore: 52,
    macdScore: 65,
    obvScore: 75,
    volatilityScore: 70,
    volumeScore: 80,
    totalScore: 68,
    recommendation: 'HOLD',
    confidence: 70,
    riskLevel: 'MEDIUM',
    trend: 'NEUTRAL',
    marketSentiment: 'NEUTRAL'
  },
  {
    symbol: 'ADA',
    price: 0.45,
    volume: 800000000,
    marketCap: 16000000000,
    change24h: 1.5,
    change7d: 4.2,
    high24h: 0.46,
    low24h: 0.44,
    ema89: 0.44,
    ema21: 0.445,
    ema7: 0.448,
    rsi: 55.0,
    macd: 0.005,
    macdSignal: 0.004,
    macdHistogram: 0.001,
    obv: 350000000,
    volatility: 2.5,
    emaScore: 65,
    rsiScore: 55,
    macdScore: 60,
    obvScore: 65,
    volatilityScore: 65,
    volumeScore: 70,
    totalScore: 63,
    recommendation: 'HOLD',
    confidence: 65,
    riskLevel: 'MEDIUM',
    trend: 'NEUTRAL',
    marketSentiment: 'NEUTRAL'
  },
  {
    symbol: 'DOT',
    price: 6.80,
    volume: 1200000000,
    marketCap: 8500000000,
    change24h: 2.1,
    change7d: 6.5,
    high24h: 6.85,
    low24h: 6.75,
    ema89: 6.70,
    ema21: 6.75,
    ema7: 6.78,
    rsi: 62.0,
    macd: 0.08,
    macdSignal: 0.06,
    macdHistogram: 0.02,
    obv: 180000000,
    volatility: 2.8,
    emaScore: 70,
    rsiScore: 62,
    macdScore: 75,
    obvScore: 70,
    volatilityScore: 60,
    volumeScore: 75,
    totalScore: 68,
    recommendation: 'BUY',
    confidence: 70,
    riskLevel: 'MEDIUM',
    trend: 'BULLISH',
    marketSentiment: 'POSITIVE'
  },
  {
    symbol: 'LINK',
    price: 15.50,
    volume: 900000000,
    marketCap: 9000000000,
    change24h: 3.2,
    change7d: 12.5,
    high24h: 15.80,
    low24h: 15.20,
    ema89: 15.20,
    ema21: 15.35,
    ema7: 15.45,
    rsi: 68.0,
    macd: 0.15,
    macdSignal: 0.10,
    macdHistogram: 0.05,
    obv: 120000000,
    volatility: 4.2,
    emaScore: 75,
    rsiScore: 68,
    macdScore: 80,
    obvScore: 75,
    volatilityScore: 50,
    volumeScore: 70,
    totalScore: 71,
    recommendation: 'BUY',
    confidence: 75,
    riskLevel: 'HIGH',
    trend: 'BULLISH',
    marketSentiment: 'POSITIVE'
  },
  {
    symbol: 'MATIC',
    price: 0.85,
    volume: 600000000,
    marketCap: 8000000000,
    change24h: 1.8,
    change7d: 8.9,
    high24h: 0.86,
    low24h: 0.84,
    ema89: 0.83,
    ema21: 0.84,
    ema7: 0.845,
    rsi: 64.0,
    macd: 0.012,
    macdSignal: 0.008,
    macdHistogram: 0.004,
    obv: 90000000,
    volatility: 3.8,
    emaScore: 70,
    rsiScore: 64,
    macdScore: 75,
    obvScore: 70,
    volatilityScore: 55,
    volumeScore: 65,
    totalScore: 67,
    recommendation: 'BUY',
    confidence: 70,
    riskLevel: 'HIGH',
    trend: 'BULLISH',
    marketSentiment: 'POSITIVE'
  },
  {
    symbol: 'AVAX',
    price: 35.00,
    volume: 800000000,
    marketCap: 13000000000,
    change24h: 2.5,
    change7d: 15.2,
    high24h: 35.50,
    low24h: 34.50,
    ema89: 34.20,
    ema21: 34.60,
    ema7: 34.80,
    rsi: 66.0,
    macd: 0.35,
    macdSignal: 0.25,
    macdHistogram: 0.10,
    obv: 150000000,
    volatility: 4.5,
    emaScore: 75,
    rsiScore: 66,
    macdScore: 80,
    obvScore: 75,
    volatilityScore: 45,
    volumeScore: 70,
    totalScore: 70,
    recommendation: 'BUY',
    confidence: 75,
    riskLevel: 'HIGH',
    trend: 'BULLISH',
    marketSentiment: 'POSITIVE'
  },
  {
    symbol: 'UNI',
    price: 8.50,
    volume: 400000000,
    marketCap: 5100000000,
    change24h: 1.2,
    change7d: 5.8,
    high24h: 8.60,
    low24h: 8.40,
    ema89: 8.40,
    ema21: 8.45,
    ema7: 8.48,
    rsi: 58.0,
    macd: 0.08,
    macdSignal: 0.06,
    macdHistogram: 0.02,
    obv: 60000000,
    volatility: 3.2,
    emaScore: 65,
    rsiScore: 58,
    macdScore: 70,
    obvScore: 65,
    volatilityScore: 60,
    volumeScore: 60,
    totalScore: 63,
    recommendation: 'HOLD',
    confidence: 65,
    riskLevel: 'HIGH',
    trend: 'NEUTRAL',
    marketSentiment: 'NEUTRAL'
  },
  {
    symbol: 'ATOM',
    price: 8.20,
    volume: 300000000,
    marketCap: 3200000000,
    change24h: 0.9,
    change7d: 3.5,
    high24h: 8.30,
    low24h: 8.15,
    ema89: 8.15,
    ema21: 8.18,
    ema7: 8.20,
    rsi: 54.0,
    macd: 0.06,
    macdSignal: 0.05,
    macdHistogram: 0.01,
    obv: 45000000,
    volatility: 2.8,
    emaScore: 60,
    rsiScore: 54,
    macdScore: 65,
    obvScore: 60,
    volatilityScore: 65,
    volumeScore: 55,
    totalScore: 60,
    recommendation: 'HOLD',
    confidence: 60,
    riskLevel: 'MEDIUM',
    trend: 'NEUTRAL',
    marketSentiment: 'NEUTRAL'
  }
]

// 添加价格数据
async function addPriceData() {
  logStep('💰', '添加所有币种价格数据')
  
  for (const currency of ALL_CURRENCY_DATA) {
    const priceData = {
      symbol: currency.symbol,
      price_usdt: currency.price,
      volume_24h: currency.volume,
      market_cap: currency.marketCap,
      price_change_24h: currency.change24h,
      price_change_7d: currency.change7d,
      high_24h: currency.high24h,
      low_24h: currency.low24h
    }
    
    const { error } = await supabase
      .from('currency_price_history')
      .insert(priceData)
    
    if (error) {
      logWarning(`添加价格数据失败 ${currency.symbol}: ${error.message}`)
    } else {
      logSuccess(`添加 ${currency.symbol} 价格数据`)
    }
  }
}

// 添加技术指标数据
async function addIndicatorData() {
  logStep('📊', '添加所有币种技术指标数据')
  
  for (const currency of ALL_CURRENCY_DATA) {
    const indicatorData = {
      symbol: currency.symbol,
      ema_89: currency.ema89,
      ema_21: currency.ema21,
      ema_7: currency.ema7,
      rsi_14: currency.rsi,
      macd: currency.macd,
      macd_signal: currency.macdSignal,
      macd_histogram: currency.macdHistogram,
      obv: currency.obv,
      volatility: currency.volatility
    }
    
    const { error } = await supabase
      .from('currency_technical_indicators')
      .insert(indicatorData)
    
    if (error) {
      logWarning(`添加技术指标失败 ${currency.symbol}: ${error.message}`)
    } else {
      logSuccess(`添加 ${currency.symbol} 技术指标`)
    }
  }
}

// 添加策略评分数据
async function addScoreData() {
  logStep('🎯', '添加所有币种策略评分数据')
  
  for (const currency of ALL_CURRENCY_DATA) {
    const scoreData = {
      symbol: currency.symbol,
      ema_score: currency.emaScore,
      rsi_score: currency.rsiScore,
      macd_score: currency.macdScore,
      obv_score: currency.obvScore,
      volatility_score: currency.volatilityScore,
      volume_score: currency.volumeScore,
      total_score: currency.totalScore,
      recommendation: currency.recommendation,
      confidence: currency.confidence,
      risk_level: currency.riskLevel,
      trend: currency.trend,
      market_sentiment: currency.marketSentiment
    }
    
    const { error } = await supabase
      .from('currency_strategy_scores')
      .insert(scoreData)
    
    if (error) {
      logWarning(`添加策略评分失败 ${currency.symbol}: ${error.message}`)
    } else {
      logSuccess(`添加 ${currency.symbol} 策略评分`)
    }
  }
}

// 添加DCA设置
async function addDCAData() {
  logStep('⚙️', '添加所有币种DCA设置')
  
  for (const currency of ALL_CURRENCY_DATA) {
    const dcaData = {
      symbol: currency.symbol,
      is_active: true,
      base_amount: 100,
      max_orders: 6,
      strategy_type: 'BALANCED',
      risk_tolerance: currency.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
    }
    
    const { error } = await supabase
      .from('multi_currency_dca_settings')
      .insert(dcaData)
    
    if (error) {
      logWarning(`添加DCA设置失败 ${currency.symbol}: ${error.message}`)
    } else {
      logSuccess(`添加 ${currency.symbol} DCA设置`)
    }
  }
}

// 主函数
async function addAllCurrencyData() {
  log('🚀 开始为所有币种添加测试数据', 'bright')
  log('=' * 60, 'blue')
  
  try {
    await addPriceData()
    await addIndicatorData()
    await addScoreData()
    await addDCAData()
    
    log('=' * 60, 'blue')
    log('🎉 所有币种测试数据添加完成！', 'bright')
    log('\n📊 数据统计:')
    log(`✅ 价格数据: ${ALL_CURRENCY_DATA.length} 个币种`, 'green')
    log(`✅ 技术指标: ${ALL_CURRENCY_DATA.length} 个币种`, 'green')
    log(`✅ 策略评分: ${ALL_CURRENCY_DATA.length} 个币种`, 'green')
    log(`✅ DCA设置: ${ALL_CURRENCY_DATA.length} 个币种`, 'green')
    
    log('\n🎯 现在可以重新运行多币种切换测试！', 'bright')
    
    return true
  } catch (error) {
    logError(`添加数据失败: ${error.message}`)
    return false
  }
}

// 运行
addAllCurrencyData()
  .then(success => {
    if (success) {
      log('\n✅ 数据添加成功完成！', 'bright')
    } else {
      log('\n❌ 数据添加失败', 'red')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logError(`执行失败: ${error.message}`)
    process.exit(1)
  }) 