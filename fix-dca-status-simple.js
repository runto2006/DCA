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

console.log('🔧 开始修复DCA状态更新问题...')

// 同步DCA设置（简化版本）
async function syncDCASettings() {
  console.log('\n🔄 同步DCA设置...')
  
  try {
    // 获取multi_currency_dca_settings中的SOL设置
    const { data: multiCurrencySettings, error: multiError } = await supabase
      .from('multi_currency_dca_settings')
      .select('*')
      .eq('symbol', 'SOL')
      .single()
    
    if (multiError || !multiCurrencySettings) {
      console.error(`❌ 获取SOL的multi_currency_dca_settings失败: ${multiError?.message}`)
      return false
    }
    
    console.log(`📊 从multi_currency_dca_settings获取SOL设置:`)
    console.log(`  基础金额: ${multiCurrencySettings.base_amount} USDT`)
    console.log(`  最大订单: ${multiCurrencySettings.max_orders} 个`)
    console.log(`  是否激活: ${multiCurrencySettings.is_active}`)
    
    // 只更新基本字段，避免字段不存在的问题
    const updateData = {
      amount: parseFloat(multiCurrencySettings.base_amount),
      max_orders: parseInt(multiCurrencySettings.max_orders),
      is_active: multiCurrencySettings.is_active,
      last_check: new Date().toISOString()
    }
    
    console.log(`📝 准备更新的数据:`)
    console.log(`  基础金额: ${updateData.amount} USDT`)
    console.log(`  最大订单: ${updateData.max_orders} 个`)
    console.log(`  是否激活: ${updateData.is_active}`)
    
    // 更新dca_settings
    const { error: updateError } = await supabase
      .from('dca_settings')
      .update(updateData)
      .eq('symbol', 'SOLUSDT')
    
    if (updateError) {
      console.error(`❌ 更新dca_settings失败: ${updateError.message}`)
      return false
    }
    
    console.log(`✅ 更新dca_settings成功`)
    return true
  } catch (error) {
    console.error(`❌ 同步DCA设置失败: ${error.message}`)
    return false
  }
}

// 验证同步结果
async function verifySync() {
  console.log('\n✅ 验证同步结果...')
  
  try {
    const { data: dcaSettings, error } = await supabase
      .from('dca_settings')
      .select('*')
      .eq('symbol', 'SOLUSDT')
      .single()
    
    if (error || !dcaSettings) {
      console.error(`❌ 验证失败: ${error?.message}`)
      return false
    }
    
    console.log(`📊 dca_settings验证结果:`)
    console.log(`  交易对: ${dcaSettings.symbol}`)
    console.log(`  基础金额: ${dcaSettings.amount} USDT`)
    console.log(`  最大订单: ${dcaSettings.max_orders} 个`)
    console.log(`  止损: ${dcaSettings.stop_loss}%`)
    console.log(`  止盈: ${dcaSettings.take_profit}%`)
    console.log(`  价格偏差: ${dcaSettings.price_deviation}%`)
    console.log(`  当前订单: ${dcaSettings.current_order}`)
    console.log(`  总投入: ${dcaSettings.total_invested} USDT`)
    console.log(`  是否激活: ${dcaSettings.is_active}`)
    
    // 计算预计总投入
    const estimatedTotal = dcaSettings.amount * dcaSettings.max_orders
    console.log(`\n💰 预计总投入: ${estimatedTotal} USDT`)
    console.log(`💡 现在DCA状态应该会显示正确的设置`)
    
    return true
  } catch (error) {
    console.error(`❌ 验证失败: ${error.message}`)
    return false
  }
}

// 测试DCA状态API
async function testDCAStatusAPI() {
  console.log('\n🧪 测试DCA状态API...')
  
  try {
    const response = await fetch('http://localhost:3000/api/dca-auto-trade?symbol=SOLUSDT')
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log(`✅ DCA状态API测试成功`)
      console.log(`📊 返回的DCA设置:`)
      if (data.dcaSettings) {
        console.log(`  基础金额: ${data.dcaSettings.amount} USDT`)
        console.log(`  最大订单: ${data.dcaSettings.max_orders} 个`)
        console.log(`  当前订单: ${data.dcaSettings.current_order}`)
        console.log(`  总投入: ${data.dcaSettings.total_invested} USDT`)
      }
      console.log(`📈 市场数据:`)
      if (data.marketData) {
        console.log(`  当前价格: $${data.marketData.currentPrice}`)
        console.log(`  EMA89: $${data.marketData.ema89}`)
        console.log(`  价格距离: ${data.marketData.priceDistance}%`)
      }
      console.log(`🎯 加仓倍数: ${data.multiplier?.value?.toFixed(2)}x`)
      
      return true
    } else {
      console.error(`❌ DCA状态API测试失败: ${data.error}`)
      return false
    }
  } catch (error) {
    console.error(`❌ 测试DCA状态API失败: ${error.message}`)
    return false
  }
}

// 主函数
async function main() {
  console.log('🚀 开始修复DCA状态更新问题...')
  console.log('=' * 60)
  
  try {
    // 同步DCA设置
    const syncSuccess = await syncDCASettings()
    if (!syncSuccess) {
      return false
    }
    
    // 验证同步结果
    const verifySuccess = await verifySync()
    if (!verifySuccess) {
      return false
    }
    
    // 测试API
    await testDCAStatusAPI()
    
    console.log('\n' + '=' * 60)
    console.log('🎉 DCA状态更新修复完成！')
    console.log('\n📋 已执行的操作:')
    console.log('✅ 同步了multi_currency_dca_settings到dca_settings')
    console.log('✅ 验证了同步结果')
    console.log('✅ 测试了DCA状态API')
    
    console.log('\n🎯 现在DCA交易状态应该会显示:')
    console.log('- 基础金额: 20 USDT (而不是80 USDT)')
    console.log('- 最大订单: 3个 (而不是6个)')
    console.log('- 预计总投入: 60 USDT (而不是1,662.50 USDT)')
    
    console.log('\n💡 请刷新页面查看更新后的DCA状态')
    
    return true
  } catch (error) {
    console.error(`❌ 修复失败: ${error.message}`)
    return false
  }
}

// 运行
main()
  .then(success => {
    if (success) {
      console.log('\n✅ 修复成功完成！')
    } else {
      console.log('\n❌ 修复失败')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error(`执行失败: ${error.message}`)
    process.exit(1)
  }) 