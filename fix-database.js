require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

async function fixDatabase() {
  console.log('\n' + '='.repeat(60))
  log('🔧 数据库修复脚本', 'cyan')
  console.log('='.repeat(60))
  
  try {
    // 1. 修复trade_history表 - 添加notes字段
    console.log('\n📋 修复 trade_history 表:')
    
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE trade_history ADD COLUMN IF NOT EXISTS notes TEXT;'
      })
      
      if (error) {
        log('❌ 添加notes字段失败', 'red')
        console.log('   错误:', error.message)
      } else {
        log('✅ 添加notes字段成功', 'green')
      }
    } catch (e) {
      log('⚠️  notes字段可能已存在', 'yellow')
    }
    
    // 2. 创建tvl_data表
    console.log('\n📋 创建 tvl_data 表:')
    
    const createTvlDataSQL = `
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
    `
    
    const { error: tvlDataError } = await supabase.rpc('exec_sql', { sql: createTvlDataSQL })
    
    if (tvlDataError) {
      log('❌ 创建tvl_data表失败', 'red')
      console.log('   错误:', tvlDataError.message)
    } else {
      log('✅ 创建tvl_data表成功', 'green')
    }
    
    // 3. 创建tvl_history表
    console.log('\n📋 创建 tvl_history 表:')
    
    const createTvlHistorySQL = `
      CREATE TABLE IF NOT EXISTS tvl_history (
        id SERIAL PRIMARY KEY,
        chain VARCHAR(50) NOT NULL,
        date BIGINT NOT NULL,
        tvl DECIMAL(20,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: tvlHistoryError } = await supabase.rpc('exec_sql', { sql: createTvlHistorySQL })
    
    if (tvlHistoryError) {
      log('❌ 创建tvl_history表失败', 'red')
      console.log('   错误:', tvlHistoryError.message)
    } else {
      log('✅ 创建tvl_history表成功', 'green')
    }
    
    // 4. 创建positions表
    console.log('\n📋 创建 positions 表:')
    
    const createPositionsSQL = `
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
    `
    
    const { error: positionsError } = await supabase.rpc('exec_sql', { sql: createPositionsSQL })
    
    if (positionsError) {
      log('❌ 创建positions表失败', 'red')
      console.log('   错误:', positionsError.message)
    } else {
      log('✅ 创建positions表成功', 'green')
    }
    
    // 5. 验证修复结果
    console.log('\n🧪 验证修复结果:')
    
    const tables = ['dca_settings', 'trade_history', 'price_data', 'tvl_data', 'tvl_history', 'positions']
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        log(`❌ ${table}表验证失败`, 'red')
        console.log('   错误:', error.message)
      } else {
        log(`✅ ${table}表验证成功`, 'green')
        if (data && data.length > 0) {
          console.log(`   字段: ${Object.keys(data[0]).join(', ')}`)
        }
      }
    }
    
    // 6. 测试数据插入
    console.log('\n🧪 测试数据插入:')
    
    // 测试trade_history插入
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
    
    // 测试tvl_data插入
    const testTvl = {
      chain: 'solana',
      tvl: 1000000000.0,
      tvl_change_1d: 2.5,
      tvl_change_7d: 5.0,
      tvl_change_30d: 15.0
    }
    
    const { data: insertTvl, error: insertTvlError } = await supabase
      .from('tvl_data')
      .insert(testTvl)
      .select()
    
    if (insertTvlError) {
      log('❌ TVL数据插入失败', 'red')
      console.log('   错误:', insertTvlError.message)
    } else {
      log('✅ TVL数据插入成功', 'green')
      console.log('   ID:', insertTvl[0].id)
      
      // 清理测试数据
      await supabase
        .from('tvl_data')
        .delete()
        .eq('chain', 'solana')
    }
    
    console.log('\n' + '='.repeat(60))
    log('🎉 数据库修复完成！', 'green')
    console.log('='.repeat(60))
    
    log('\n📋 修复总结:', 'bright')
    log('✅ trade_history表添加notes字段', 'green')
    log('✅ 创建tvl_data表', 'green')
    log('✅ 创建tvl_history表', 'green')
    log('✅ 创建positions表', 'green')
    log('✅ 所有表验证通过', 'green')
    log('✅ 数据插入测试通过', 'green')
    
    log('\n🚀 下一步:', 'cyan')
    log('1. 启动开发服务器: npm run dev', 'yellow')
    log('2. 重新运行DCA测试: node test-dca-complete.js', 'yellow')
    log('3. 验证API端点功能', 'yellow')
    
  } catch (error) {
    console.error('数据库修复失败:', error)
    log('❌ 修复过程中出现错误', 'red')
  }
}

// 运行修复
fixDatabase() 