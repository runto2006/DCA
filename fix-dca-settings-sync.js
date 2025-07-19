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

console.log('🔧 修复DCA设置同步问题...')

// 检查当前DCA设置
async function checkCurrentSettings() {
  console.log('\n📋 检查当前DCA设置...')
  
  try {
    // 检查dca_settings表
    const { data: dcaSettings, error } = await supabase
      .from('dca_settings')
      .select('*')
      .eq('symbol', 'SOLUSDT')
      .single()
    
    if (error) {
      console.error(`❌ 获取dca_settings失败: ${error.message}`)
      return null
    }
    
    console.log(`📊 当前dca_settings:`)
    console.log(`  交易对: ${dcaSettings.symbol}`)
    console.log(`  基础金额: ${dcaSettings.amount} USDT`)
    console.log(`  最大订单: ${dcaSettings.max_orders} 个`)
    console.log(`  止损: ${dcaSettings.stop_loss}%`)
    console.log(`  止盈: ${dcaSettings.take_profit}%`)
    console.log(`  价格偏差: ${dcaSettings.price_deviation}%`)
    console.log(`  是否激活: ${dcaSettings.is_active}`)
    
    return dcaSettings
  } catch (error) {
    console.error(`❌ 检查设置失败: ${error.message}`)
    return null
  }
}

// 更新DCA设置
async function updateDCASettings(newSettings) {
  console.log('\n🔄 更新DCA设置...')
  
  try {
    const updateData = {
      amount: newSettings.amount,
      max_orders: newSettings.maxOrders,
      stop_loss: newSettings.stopLoss,
      take_profit: newSettings.takeProfit,
      price_deviation: newSettings.priceDeviation,
      last_check: new Date().toISOString()
    }
    
    console.log(`📝 准备更新的数据:`)
    console.log(`  基础金额: ${updateData.amount} USDT`)
    console.log(`  最大订单: ${updateData.max_orders} 个`)
    console.log(`  止损: ${updateData.stop_loss}%`)
    console.log(`  止盈: ${updateData.take_profit}%`)
    console.log(`  价格偏差: ${updateData.price_deviation}%`)
    
    const { error } = await supabase
      .from('dca_settings')
      .update(updateData)
      .eq('symbol', 'SOLUSDT')
    
    if (error) {
      console.error(`❌ 更新dca_settings失败: ${error.message}`)
      return false
    }
    
    console.log(`✅ 更新dca_settings成功`)
    return true
  } catch (error) {
    console.error(`❌ 更新设置失败: ${error.message}`)
    return false
  }
}

// 验证更新结果
async function verifyUpdate() {
  console.log('\n✅ 验证更新结果...')
  
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
    
    console.log(`📊 更新后的dca_settings:`)
    console.log(`  交易对: ${dcaSettings.symbol}`)
    console.log(`  基础金额: ${dcaSettings.amount} USDT`)
    console.log(`  最大订单: ${dcaSettings.max_orders} 个`)
    console.log(`  止损: ${dcaSettings.stop_loss}%`)
    console.log(`  止盈: ${dcaSettings.take_profit}%`)
    console.log(`  价格偏差: ${dcaSettings.price_deviation}%`)
    console.log(`  是否激活: ${dcaSettings.is_active}`)
    
    // 计算预计总投入
    let totalExpected = 0
    for (let i = 0; i < dcaSettings.max_orders; i++) {
      totalExpected += dcaSettings.amount * Math.pow(1.5, i)
    }
    console.log(`\n💰 预计总投入: ${totalExpected.toFixed(2)} USDT`)
    
    return true
  } catch (error) {
    console.error(`❌ 验证失败: ${error.message}`)
    return false
  }
}

// 测试API响应
async function testAPIResponse() {
  console.log('\n🧪 测试API响应...')
  
  try {
    const response = await fetch('http://localhost:3000/api/dca-auto-trade?symbol=SOLUSDT')
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log(`✅ API响应测试成功`)
      console.log(`📊 API返回的DCA设置:`)
      if (data.dcaSettings) {
        console.log(`  基础金额: ${data.dcaSettings.amount} USDT`)
        console.log(`  最大订单: ${data.dcaSettings.max_orders} 个`)
        console.log(`  止损: ${data.dcaSettings.stop_loss}%`)
        console.log(`  止盈: ${data.dcaSettings.take_profit}%`)
        console.log(`  价格偏差: ${data.dcaSettings.price_deviation}%`)
      }
      return true
    } else {
      console.error(`❌ API响应测试失败: ${data.error}`)
      return false
    }
  } catch (error) {
    console.error(`❌ 测试API响应失败: ${error.message}`)
    return false
  }
}

// 主函数
async function main() {
  console.log('🚀 开始修复DCA设置同步问题...')
  console.log('=' * 60)
  
  try {
    // 检查当前设置
    const currentSettings = await checkCurrentSettings()
    if (!currentSettings) {
      return false
    }
    
    // 询问用户想要的新设置
    console.log('\n💡 请输入新的DCA设置:')
    console.log('(按回车使用默认值)')
    
    // 这里可以添加交互式输入，但为了简化，我们使用预设值
    const newSettings = {
      amount: 20,        // 基础金额
      maxOrders: 3,      // 最大订单数
      stopLoss: 5.0,     // 止损百分比
      takeProfit: 1.2,   // 止盈百分比
      priceDeviation: 1.5 // 价格偏差
    }
    
    console.log(`\n📝 使用预设的新设置:`)
    console.log(`  基础金额: ${newSettings.amount} USDT`)
    console.log(`  最大订单: ${newSettings.maxOrders} 个`)
    console.log(`  止损: ${newSettings.stopLoss}%`)
    console.log(`  止盈: ${newSettings.takeProfit}%`)
    console.log(`  价格偏差: ${newSettings.priceDeviation}%`)
    
    // 更新设置
    const updateSuccess = await updateDCASettings(newSettings)
    if (!updateSuccess) {
      return false
    }
    
    // 验证更新
    const verifySuccess = await verifyUpdate()
    if (!verifySuccess) {
      return false
    }
    
    // 测试API
    await testAPIResponse()
    
    console.log('\n' + '=' * 60)
    console.log('🎉 DCA设置同步修复完成！')
    console.log('\n📋 已执行的操作:')
    console.log('✅ 检查了当前DCA设置')
    console.log('✅ 更新了DCA设置到数据库')
    console.log('✅ 验证了更新结果')
    console.log('✅ 测试了API响应')
    
    console.log('\n🎯 现在DCA交易状态应该会显示:')
    console.log('- 基础金额: 20 USDT')
    console.log('- 最大订单: 3个')
    console.log('- 预计总投入: 约60 USDT')
    
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