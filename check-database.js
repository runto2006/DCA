// 检查数据库表是否存在
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 环境变量未配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabase() {
  console.log('🔍 检查数据库表...\n')

  try {
    // 检查dca_settings表
    console.log('1️⃣ 检查dca_settings表...')
    const { data: dcaData, error: dcaError } = await supabase
      .from('dca_settings')
      .select('count')
      .limit(1)
    
    if (dcaError) {
      console.error('❌ dca_settings表不存在:', dcaError.message)
    } else {
      console.log('✅ dca_settings表存在')
    }

    // 检查trade_history表
    console.log('\n2️⃣ 检查trade_history表...')
    const { data: tradeData, error: tradeError } = await supabase
      .from('trade_history')
      .select('count')
      .limit(1)
    
    if (tradeError) {
      console.error('❌ trade_history表不存在:', tradeError.message)
    } else {
      console.log('✅ trade_history表存在')
    }

    // 检查user_positions表
    console.log('\n3️⃣ 检查user_positions表...')
    const { data: positionData, error: positionError } = await supabase
      .from('user_positions')
      .select('count')
      .limit(1)
    
    if (positionError) {
      console.error('❌ user_positions表不存在:', positionError.message)
    } else {
      console.log('✅ user_positions表存在')
    }

    // 尝试创建dca_settings表
    console.log('\n4️⃣ 尝试创建dca_settings表...')
    const { error: createError } = await supabase
      .from('dca_settings')
      .insert({
        symbol: 'TEST',
        amount: 10,
        max_orders: 1,
        current_order: 0,
        price_deviation: 1.0,
        take_profit: 1.0,
        stop_loss: 1.0,
        is_active: false,
        user_id: 'test'
      })
      .select()
    
    if (createError) {
      console.error('❌ 无法插入数据到dca_settings表:', createError.message)
      
      // 如果表不存在，尝试手动创建
      if (createError.message.includes('does not exist')) {
        console.log('📝 尝试手动创建dca_settings表...')
        await createTableManually()
      }
    } else {
      console.log('✅ 成功插入测试数据到dca_settings表')
      
      // 清理测试数据
      await supabase
        .from('dca_settings')
        .delete()
        .eq('symbol', 'TEST')
      
      console.log('✅ 测试数据已清理')
    }

  } catch (error) {
    console.error('💥 检查过程中发生错误:', error.message)
  }
}

async function createTableManually() {
  try {
    // 使用SQL查询来创建表
    const { error } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS dca_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            max_orders INTEGER NOT NULL DEFAULT 6,
            current_order INTEGER NOT NULL DEFAULT 0,
            price_deviation DECIMAL(5,2) NOT NULL DEFAULT 1.5,
            take_profit DECIMAL(5,2) NOT NULL DEFAULT 1.2,
            stop_loss DECIMAL(5,2) NOT NULL DEFAULT 5.0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            user_id VARCHAR(50) NOT NULL DEFAULT 'default_user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
    
    if (error) {
      console.error('❌ 手动创建表失败:', error.message)
      console.log('💡 请手动在Supabase控制台中创建dca_settings表')
      return false
    }
    
    console.log('✅ 手动创建dca_settings表成功')
    return true
    
  } catch (error) {
    console.error('❌ 手动创建表过程中发生错误:', error.message)
    return false
  }
}

checkDatabase().then(() => {
  console.log('\n🎯 数据库检查完成')
  console.log('💡 如果表不存在，请在Supabase控制台中手动创建')
}) 