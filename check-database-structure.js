const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 颜色输出
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

async function checkDatabaseStructure() {
  console.log('\n' + '='.repeat(60))
  log('🔍 数据库结构检查', 'cyan')
  console.log('='.repeat(60))
  
  try {
    // 检查dca_settings表
    console.log('\n📋 检查 dca_settings 表:')
    const { data: settingsData, error: settingsError } = await supabase
      .from('dca_settings')
      .select('*')
      .limit(1)
    
    if (settingsError) {
      log('❌ dca_settings表查询失败', 'red')
      console.log('   错误:', settingsError.message)
    } else {
      log('✅ dca_settings表存在', 'green')
      if (settingsData && settingsData.length > 0) {
        console.log('   字段:', Object.keys(settingsData[0]).join(', '))
      }
    }
    
    // 检查trade_history表
    console.log('\n📋 检查 trade_history 表:')
    const { data: tradeData, error: tradeError } = await supabase
      .from('trade_history')
      .select('*')
      .limit(1)
    
    if (tradeError) {
      log('❌ trade_history表查询失败', 'red')
      console.log('   错误:', tradeError.message)
      
      // 尝试创建trade_history表
      console.log('\n🔧 尝试创建 trade_history 表:')
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS trade_history (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20) NOT NULL,
          trade_type VARCHAR(10) NOT NULL,
          price DECIMAL(20,8) NOT NULL,
          quantity DECIMAL(20,8) NOT NULL,
          total_amount DECIMAL(20,2) NOT NULL,
          strategy_reason TEXT,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
      
      if (createError) {
        log('❌ 创建表失败', 'red')
        console.log('   错误:', createError.message)
      } else {
        log('✅ 创建表成功', 'green')
      }
    } else {
      log('✅ trade_history表存在', 'green')
      if (tradeData && tradeData.length > 0) {
        console.log('   字段:', Object.keys(tradeData[0]).join(', '))
      }
    }
    
    // 检查其他相关表
    const tables = ['price_data', 'tvl_data', 'tvl_history', 'positions']
    
    for (const table of tables) {
      console.log(`\n📋 检查 ${table} 表:`)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        log(`❌ ${table}表查询失败`, 'red')
        console.log('   错误:', error.message)
      } else {
        log(`✅ ${table}表存在`, 'green')
        if (data && data.length > 0) {
          console.log('   字段:', Object.keys(data[0]).join(', '))
        }
      }
    }
    
    // 测试插入数据
    console.log('\n🧪 测试数据插入:')
    
    // 测试dca_settings插入
    const testDCA = {
      symbol: 'TESTUSDT',
      is_active: false,
      amount: 100,
      max_orders: 5,
      price_deviation: 1.5,
      take_profit: 1.2,
      stop_loss: 5.0,
      current_order: 0,
      total_invested: 0,
      last_check: new Date().toISOString()
    }
    
    const { data: insertDCA, error: insertDCAError } = await supabase
      .from('dca_settings')
      .insert(testDCA)
      .select()
    
    if (insertDCAError) {
      log('❌ DCA设置插入失败', 'red')
      console.log('   错误:', insertDCAError.message)
    } else {
      log('✅ DCA设置插入成功', 'green')
      console.log('   ID:', insertDCA[0].id)
      
      // 清理测试数据
      await supabase
        .from('dca_settings')
        .delete()
        .eq('symbol', 'TESTUSDT')
    }
    
    // 测试trade_history插入（如果表存在）
    const testTrade = {
      symbol: 'TESTUSDT',
      trade_type: 'BUY',
      price: 100.0,
      quantity: 1.0,
      total_amount: 100.0,
      strategy_reason: '测试交易',
      notes: '测试记录'
    }
    
    const { data: insertTrade, error: insertTradeError } = await supabase
      .from('trade_history')
      .insert(testTrade)
      .select()
    
    if (insertTradeError) {
      log('❌ 交易记录插入失败', 'red')
      console.log('   错误:', insertTradeError.message)
    } else {
      log('✅ 交易记录插入成功', 'green')
      console.log('   ID:', insertTrade[0].id)
      
      // 清理测试数据
      await supabase
        .from('trade_history')
        .delete()
        .eq('symbol', 'TESTUSDT')
    }
    
    console.log('\n' + '='.repeat(60))
    log('🎉 数据库结构检查完成', 'green')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('数据库结构检查失败:', error)
  }
}

// 运行检查
checkDatabaseStructure() 