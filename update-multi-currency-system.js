require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 配置检查
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量')
  console.error('请确保 .env.local 文件中包含:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
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
  magenta: '\x1b[35m',
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

// 读取SQL文件
function readSqlFile(filename) {
  try {
    const filePath = path.join(__dirname, filename)
    return fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    logError(`无法读取文件 ${filename}: ${error.message}`)
    return null
  }
}

// 执行SQL语句
async function executeSql(sql, description) {
  try {
    logInfo(`执行: ${description}`)
    
    // 分割SQL语句（按分号分割）
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        await supabase.rpc('exec_sql', { sql: statement + ';' })
      }
    }
    
    logSuccess(`${description} 完成`)
    return true
  } catch (error) {
    logError(`${description} 失败: ${error.message}`)
    return false
  }
}

// 检查表是否存在
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error && error.code === '42P01') { // 表不存在错误
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

// 备份现有数据
async function backupExistingData() {
  logStep('📦', '备份现有数据')
  
  const tablesToBackup = [
    'price_data',
    'technical_indicators', 
    'strategy_scores',
    'user_positions',
    'trade_history',
    'dca_settings'
  ]
  
  const backupData = {}
  
  for (const tableName of tablesToBackup) {
    try {
      const exists = await checkTableExists(tableName)
      if (exists) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
        
        if (!error && data) {
          backupData[tableName] = data
          logSuccess(`备份 ${tableName}: ${data.length} 条记录`)
        }
      }
    } catch (error) {
      logWarning(`备份 ${tableName} 失败: ${error.message}`)
    }
  }
  
  // 保存备份到文件
  const backupFile = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
  logSuccess(`备份数据已保存到: ${backupFile}`)
  
  return backupData
}

// 创建多币种数据库结构
async function createMultiCurrencyDatabase() {
  logStep('🗄️', '创建多币种数据库结构')
  
  const sqlFile = readSqlFile('multi-currency-database.sql')
  if (!sqlFile) {
    logError('无法读取数据库脚本文件')
    return false
  }
  
  const success = await executeSql(sqlFile, '创建多币种数据库结构')
  return success
}

// 迁移现有数据
async function migrateExistingData(backupData) {
  logStep('🔄', '迁移现有数据')
  
  try {
    // 迁移价格数据
    if (backupData.price_data) {
      logInfo('迁移价格数据...')
      for (const record of backupData.price_data) {
        await supabase
          .from('currency_price_history')
          .insert({
            symbol: record.symbol,
            price_usdt: record.price,
            volume_24h: record.volume_24h,
            market_cap: record.market_cap,
            timestamp: record.timestamp
          })
      }
      logSuccess(`迁移了 ${backupData.price_data.length} 条价格数据`)
    }
    
    // 迁移技术指标数据
    if (backupData.technical_indicators) {
      logInfo('迁移技术指标数据...')
      for (const record of backupData.technical_indicators) {
        await supabase
          .from('currency_technical_indicators')
          .insert({
            symbol: record.symbol,
            ema_89: record.ema_89,
            obv: record.obv,
            rsi_14: record.rsi,
            macd: record.macd,
            macd_signal: record.macd_signal,
            macd_histogram: record.macd_histogram,
            timestamp: record.timestamp
          })
      }
      logSuccess(`迁移了 ${backupData.technical_indicators.length} 条技术指标数据`)
    }
    
    // 迁移策略评分数据
    if (backupData.strategy_scores) {
      logInfo('迁移策略评分数据...')
      for (const record of backupData.strategy_scores) {
        await supabase
          .from('currency_strategy_scores')
          .insert({
            symbol: record.symbol,
            ema_score: record.ema_score,
            rsi_score: record.rsi_score,
            macd_score: record.macd_score,
            obv_score: record.obv_score,
            total_score: record.total_score,
            recommendation: record.recommendation,
            confidence: record.confidence,
            risk_level: record.risk_level,
            trend: record.trend,
            support: record.support,
            resistance: record.resistance,
            volatility: record.volatility,
            timestamp: record.timestamp
          })
      }
      logSuccess(`迁移了 ${backupData.strategy_scores.length} 条策略评分数据`)
    }
    
    // 迁移DCA设置
    if (backupData.dca_settings) {
      logInfo('迁移DCA设置...')
      for (const record of backupData.dca_settings) {
        await supabase
          .from('multi_currency_dca_settings')
          .insert({
            symbol: record.symbol,
            is_active: record.is_active,
            base_amount: record.amount,
            max_orders: record.max_orders,
            price_deviation: record.price_deviation,
            take_profit_percentage: record.take_profit,
            stop_loss_percentage: record.stop_loss,
            current_order: record.current_order,
            total_invested: record.total_invested,
            last_check: record.last_check
          })
      }
      logSuccess(`迁移了 ${backupData.dca_settings.length} 条DCA设置`)
    }
    
    // 迁移持仓数据
    if (backupData.user_positions) {
      logInfo('迁移持仓数据...')
      for (const record of backupData.user_positions) {
        await supabase
          .from('multi_currency_positions')
          .insert({
            user_id: record.user_id,
            symbol: record.symbol,
            position_type: record.position_type,
            entry_price: record.entry_price,
            quantity: record.quantity,
            total_amount: record.total_amount,
            stop_loss: record.stop_loss,
            take_profit: record.take_profit,
            strategy_reason: record.strategy_reason,
            notes: record.notes,
            entry_date: record.entry_date,
            exit_price: record.exit_price,
            exit_date: record.exit_date,
            status: record.status,
            pnl: record.pnl,
            pnl_percentage: record.pnl_percentage,
            trailing_stop_enabled: record.trailing_stop_enabled,
            trailing_stop_distance: record.trailing_stop_distance,
            trailing_stop_price: record.trailing_stop_price,
            highest_price: record.highest_price,
            lowest_price: record.lowest_price
          })
      }
      logSuccess(`迁移了 ${backupData.user_positions.length} 条持仓数据`)
    }
    
    // 迁移交易历史
    if (backupData.trade_history) {
      logInfo('迁移交易历史...')
      for (const record of backupData.trade_history) {
        await supabase
          .from('multi_currency_trade_history')
          .insert({
            user_id: record.user_id,
            symbol: record.symbol,
            trade_type: record.trade_type,
            price: record.price,
            quantity: record.quantity,
            total_amount: record.total_amount,
            strategy_reason: record.strategy_reason,
            notes: record.notes,
            timestamp: record.timestamp
          })
      }
      logSuccess(`迁移了 ${backupData.trade_history.length} 条交易历史`)
    }
    
    return true
  } catch (error) {
    logError(`数据迁移失败: ${error.message}`)
    return false
  }
}

// 验证更新结果
async function verifyUpdate() {
  logStep('🔍', '验证更新结果')
  
  const tablesToCheck = [
    'currency_config',
    'currency_price_history',
    'currency_technical_indicators',
    'currency_strategy_scores',
    'multi_currency_dca_settings',
    'multi_currency_positions',
    'multi_currency_trade_history',
    'currency_portfolio_config'
  ]
  
  let allTablesExist = true
  
  for (const tableName of tablesToCheck) {
    const exists = await checkTableExists(tableName)
    if (exists) {
      logSuccess(`表 ${tableName} 存在`)
    } else {
      logError(`表 ${tableName} 不存在`)
      allTablesExist = false
    }
  }
  
  // 检查币种配置
  try {
    const { data: currencies, error } = await supabase
      .from('currency_config')
      .select('*')
      .eq('is_active', true)
    
    if (!error && currencies) {
      logSuccess(`币种配置: ${currencies.length} 个活跃币种`)
      currencies.forEach(currency => {
        logInfo(`  - ${currency.symbol} (${currency.name})`)
      })
    }
  } catch (error) {
    logError(`检查币种配置失败: ${error.message}`)
  }
  
  return allTablesExist
}

// 创建默认组合配置
async function createDefaultPortfolio() {
  logStep('📊', '创建默认组合配置')
  
  try {
    const defaultPortfolio = {
      portfolio_name: '默认组合',
      description: '系统默认的多币种投资组合',
      target_allocation: {
        BTC: 0.4,
        ETH: 0.3,
        SOL: 0.2,
        ADA: 0.1
      },
      rebalance_threshold: 5.0,
      max_single_currency: 50.0,
      risk_level: 'MEDIUM',
      is_active: true
    }
    
    const { data, error } = await supabase
      .from('currency_portfolio_config')
      .insert(defaultPortfolio)
      .select()
    
    if (!error) {
      logSuccess('默认组合配置创建成功')
    } else {
      logWarning(`创建默认组合失败: ${error.message}`)
    }
  } catch (error) {
    logWarning(`创建默认组合失败: ${error.message}`)
  }
}

// 主更新函数
async function updateMultiCurrencySystem() {
  log('🚀 开始自动更新多币种系统', 'bright')
  log('=' * 50, 'blue')
  
  const startTime = Date.now()
  
  try {
    // 1. 备份现有数据
    const backupData = await backupExistingData()
    
    // 2. 创建多币种数据库结构
    const dbCreated = await createMultiCurrencyDatabase()
    if (!dbCreated) {
      logError('数据库结构创建失败，更新终止')
      return false
    }
    
    // 3. 迁移现有数据
    if (Object.keys(backupData).length > 0) {
      const migrationSuccess = await migrateExistingData(backupData)
      if (!migrationSuccess) {
        logWarning('数据迁移部分失败，但继续执行')
      }
    }
    
    // 4. 创建默认组合配置
    await createDefaultPortfolio()
    
    // 5. 验证更新结果
    const verificationSuccess = await verifyUpdate()
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    log('=' * 50, 'blue')
    if (verificationSuccess) {
      log('🎉 多币种系统更新成功！', 'bright')
      logSuccess(`总耗时: ${duration} 秒`)
      logInfo('系统现在支持多币种交易和管理')
      logInfo('请重启应用程序以应用所有更改')
    } else {
      log('⚠️ 多币种系统更新部分成功', 'yellow')
      logWarning('请检查错误信息并手动修复问题')
    }
    
    return verificationSuccess
    
  } catch (error) {
    logError(`更新过程中发生错误: ${error.message}`)
    return false
  }
}

// 运行更新
if (require.main === module) {
  updateMultiCurrencySystem()
    .then(success => {
      if (success) {
        log('\n🎯 下一步操作:', 'bright')
        log('1. 重启应用程序: npm run dev', 'cyan')
        log('2. 访问多币种界面', 'cyan')
        log('3. 配置DCA策略', 'cyan')
        log('4. 测试交易功能', 'cyan')
      } else {
        log('\n🔧 故障排除:', 'bright')
        log('1. 检查数据库连接', 'yellow')
        log('2. 验证环境变量', 'yellow')
        log('3. 查看错误日志', 'yellow')
        log('4. 联系技术支持', 'yellow')
      }
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      logError(`更新失败: ${error.message}`)
      process.exit(1)
    })
}

module.exports = { updateMultiCurrencySystem } 