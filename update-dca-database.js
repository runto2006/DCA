require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

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

async function updateDatabase() {
  try {
    console.log('🔧 开始更新数据库以支持DCA功能...')

    // 1. 创建DCA设置表
    console.log('📊 创建DCA设置表...')
    await supabase.rpc('exec_sql', {
      sql: `
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
            last_check TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // 2. 创建索引
    console.log('📈 创建索引...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_dca_settings_symbol_active ON dca_settings(symbol, is_active);
      `
    })

    // 3. 创建触发器函数
    console.log('🔄 创建触发器函数...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    })

    // 4. 创建触发器
    console.log('⚡ 创建触发器...')
    await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trigger_update_dca_settings_updated_at ON dca_settings;
        CREATE TRIGGER trigger_update_dca_settings_updated_at
            BEFORE UPDATE ON dca_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    })

    // 5. 添加约束
    console.log('🔒 添加约束...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE dca_settings 
        ADD CONSTRAINT IF NOT EXISTS unique_dca_symbol UNIQUE (symbol);
      `
    })

    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE dca_settings 
        ADD CONSTRAINT IF NOT EXISTS check_dca_amount_positive CHECK (amount > 0);
      `
    })

    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE dca_settings 
        ADD CONSTRAINT IF NOT EXISTS check_dca_max_orders_positive CHECK (max_orders > 0);
      `
    })

    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE dca_settings 
        ADD CONSTRAINT IF NOT EXISTS check_dca_current_order_valid CHECK (current_order >= 0 AND current_order <= max_orders);
      `
    })

    // 6. 创建视图
    console.log('👁️ 创建视图...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE VIEW dca_trading_summary AS
        SELECT 
            ds.symbol,
            ds.is_active,
            ds.current_order,
            ds.max_orders,
            ds.total_invested,
            ds.amount,
            ds.last_check,
            CASE 
                WHEN ds.current_order >= ds.max_orders THEN 'COMPLETED'
                WHEN ds.is_active THEN 'ACTIVE'
                ELSE 'STOPPED'
            END as status
        FROM dca_settings ds;
      `
    })

    console.log('✅ 数据库更新完成！')
    console.log('')
    console.log('📋 已创建的功能:')
    console.log('  - dca_settings 表 (DCA交易设置)')
    console.log('  - 相关索引和约束')
    console.log('  - 自动更新时间戳触发器')
    console.log('  - dca_trading_summary 视图')
    console.log('')
    console.log('🎯 现在可以启动DCA自动交易功能了！')

  } catch (error) {
    console.error('❌ 数据库更新失败:', error)
    process.exit(1)
  }
}

updateDatabase() 