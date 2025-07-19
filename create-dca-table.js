// 手动创建dca_settings表
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 环境变量未配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createDCATable() {
  console.log('🔧 手动创建dca_settings表...\n')

  try {
    // 尝试直接插入数据来创建表结构
    console.log('1️⃣ 尝试插入测试数据...')
    const testData = {
      symbol: 'SOLUSDT',
      amount: 80,
      max_orders: 6,
      current_order: 0,
      price_deviation: 1.5,
      take_profit: 1.2,
      stop_loss: 5.0,
      is_active: false,
      total_invested: 0,
      user_id: 'default_user'
    }

    const { data, error } = await supabase
      .from('dca_settings')
      .insert(testData)
      .select()

    if (error) {
      console.error('❌ 插入失败:', error.message)
      
      if (error.message.includes('does not exist')) {
        console.log('📝 表不存在，需要手动创建')
        console.log('💡 请在Supabase控制台中执行以下SQL:')
        console.log(`
CREATE TABLE IF NOT EXISTS dca_settings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    amount DECIMAL(20, 8) NOT NULL,
    max_orders INTEGER DEFAULT 6,
    price_deviation DECIMAL(10, 4) DEFAULT 1.5,
    take_profit DECIMAL(10, 4) DEFAULT 1.2,
    stop_loss DECIMAL(10, 4) DEFAULT 5.0,
    current_order INTEGER DEFAULT 0,
    total_invested DECIMAL(20, 8) DEFAULT 0,
    user_id VARCHAR(50) DEFAULT 'default_user',
    last_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dca_settings_symbol_active ON dca_settings(symbol, is_active);

ALTER TABLE dca_settings 
ADD CONSTRAINT IF NOT EXISTS unique_dca_symbol UNIQUE (symbol);
        `)
        return false
      }
      return false
    }

    console.log('✅ 插入成功，表已存在')
    console.log('插入的数据ID:', data[0].id)

    // 清理测试数据
    console.log('\n2️⃣ 清理测试数据...')
    const { error: deleteError } = await supabase
      .from('dca_settings')
      .delete()
      .eq('id', data[0].id)

    if (deleteError) {
      console.error('❌ 清理失败:', deleteError.message)
    } else {
      console.log('✅ 测试数据已清理')
    }

    return true

  } catch (error) {
    console.error('💥 创建表过程中发生错误:', error.message)
    return false
  }
}

createDCATable().then(success => {
  if (success) {
    console.log('\n🎉 dca_settings表创建成功！')
    console.log('💡 现在可以测试DCA功能了')
  } else {
    console.log('\n❌ 需要手动创建表')
    console.log('💡 请按照上面的SQL语句在Supabase控制台中创建表')
  }
}) 