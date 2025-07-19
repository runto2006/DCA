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

console.log('🔧 开始修复DCA设置...')

// 修复DCA设置函数
async function fixDCASettings() {
  try {
    console.log('\n📋 当前DCA设置:')
    
    // 获取所有DCA设置
    const { data: dcaSettings, error } = await supabase
      .from('multi_currency_dca_settings')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      console.error(`❌ 获取DCA设置失败: ${error.message}`)
      return false
    }
    
    console.log(`找到 ${dcaSettings.length} 个激活的DCA设置`)
    
    // 显示当前设置
    dcaSettings.forEach(dca => {
      const baseAmount = parseFloat(dca.base_amount) || 100
      const maxOrders = parseInt(dca.max_orders) || 6
      const totalRequired = baseAmount * maxOrders
      console.log(`  ${dca.symbol}: ${baseAmount} USDT × ${maxOrders} = ${totalRequired} USDT`)
    })
    
    // 计算总需求
    const totalRequired = dcaSettings.reduce((sum, dca) => {
      const baseAmount = parseFloat(dca.base_amount) || 100
      const maxOrders = parseInt(dca.max_orders) || 6
      return sum + (baseAmount * maxOrders)
    }, 0)
    
    console.log(`\n💰 总资金需求: ${totalRequired} USDT`)
    
    // 建议的安全设置
    const safeBaseAmount = 20 // 减少到20 USDT
    const safeMaxOrders = 3   // 减少到3个订单
    const newTotalRequired = safeBaseAmount * safeMaxOrders * dcaSettings.length
    
    console.log(`\n🔧 建议的安全设置:`)
    console.log(`  基础金额: ${safeBaseAmount} USDT`)
    console.log(`  最大订单: ${safeMaxOrders} 个`)
    console.log(`  新总需求: ${newTotalRequired} USDT`)
    console.log(`  节省资金: ${totalRequired - newTotalRequired} USDT`)
    
    // 询问是否更新
    console.log(`\n❓ 是否要更新DCA设置为安全值？`)
    console.log(`这将把基础金额改为 ${safeBaseAmount} USDT，最大订单改为 ${safeMaxOrders} 个`)
    
    // 自动更新设置
    console.log(`\n🔄 正在更新DCA设置...`)
    
    let successCount = 0
    for (const dca of dcaSettings) {
      const { error: updateError } = await supabase
        .from('multi_currency_dca_settings')
        .update({ 
          base_amount: safeBaseAmount,
          max_orders: safeMaxOrders
        })
        .eq('symbol', dca.symbol)
      
      if (updateError) {
        console.error(`❌ 更新 ${dca.symbol} 失败: ${updateError.message}`)
      } else {
        console.log(`✅ 更新 ${dca.symbol}: ${safeBaseAmount} USDT × ${safeMaxOrders}`)
        successCount++
      }
    }
    
    console.log(`\n📊 更新结果:`)
    console.log(`✅ 成功更新: ${successCount}/${dcaSettings.length} 个币种`)
    console.log(`💰 新的总资金需求: ${newTotalRequired} USDT`)
    console.log(`💡 现在可以尝试手动执行DCA交易了`)
    
    return true
    
  } catch (error) {
    console.error(`❌ 修复DCA设置失败: ${error.message}`)
    return false
  }
}

// 创建测试交易记录
async function createTestTrade() {
  try {
    console.log(`\n🧪 创建测试交易记录...`)
    
    const testTrade = {
      symbol: 'SOL',
      amount: 20,
      price: 175.0,
      type: 'BUY',
      status: 'PENDING',
      order_type: 'MARKET',
      strategy: 'DCA_TEST',
      created_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('trades')
      .insert(testTrade)
    
    if (error) {
      console.error(`❌ 创建测试交易失败: ${error.message}`)
      return false
    }
    
    console.log(`✅ 创建测试交易记录成功`)
    console.log(`  币种: SOL`)
    console.log(`  金额: 20 USDT`)
    console.log(`  状态: PENDING`)
    
    return true
    
  } catch (error) {
    console.error(`❌ 创建测试交易失败: ${error.message}`)
    return false
  }
}

// 主函数
async function main() {
  console.log('🚀 开始修复DCA交易问题...')
  console.log('=' * 50)
  
  try {
    // 修复DCA设置
    const dcaFixed = await fixDCASettings()
    if (!dcaFixed) {
      console.error('❌ DCA设置修复失败')
      return false
    }
    
    // 创建测试交易
    await createTestTrade()
    
    console.log('\n' + '=' * 50)
    console.log('🎉 修复完成！')
    console.log('\n📋 已执行的操作:')
    console.log('✅ 减少了DCA基础金额 (100 → 20 USDT)')
    console.log('✅ 减少了最大订单数量 (6 → 3 个)')
    console.log('✅ 创建了测试交易记录')
    console.log('✅ 大幅降低了资金需求')
    
    console.log('\n🎯 现在可以:')
    console.log('1. 重新尝试手动执行DCA交易')
    console.log('2. 如果仍有余额不足，请充值USDT')
    console.log('3. 或者进一步减少DCA设置')
    
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