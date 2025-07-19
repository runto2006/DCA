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

console.log('🔍 检查DCA状态...')

// 检查DCA设置状态
async function checkDCAStatus() {
  console.log('\n📋 检查DCA设置状态...')
  
  try {
    // 检查dca_settings表
    const { data: dcaSettings, error } = await supabase
      .from('dca_settings')
      .select('*')
      .eq('symbol', 'SOLUSDT')
      .single()
    
    if (error) {
      console.error(`❌ 获取dca_settings失败: ${error.message}`)
      return false
    }
    
    console.log(`📊 DCA设置状态:`)
    console.log(`  交易对: ${dcaSettings.symbol}`)
    console.log(`  是否激活: ${dcaSettings.is_active}`)
    console.log(`  基础金额: ${dcaSettings.amount} USDT`)
    console.log(`  最大订单: ${dcaSettings.max_orders} 个`)
    console.log(`  当前订单: ${dcaSettings.current_order}`)
    console.log(`  总投入: ${dcaSettings.total_invested} USDT`)
    console.log(`  最后检查: ${dcaSettings.last_check}`)
    
    return dcaSettings
  } catch (error) {
    console.error(`❌ 检查DCA状态失败: ${error.message}`)
    return false
  }
}

// 检查市场数据
async function checkMarketData() {
  console.log('\n📈 检查市场数据...')
  
  try {
    const response = await fetch('http://localhost:3000/api/dca-auto-trade?symbol=SOLUSDT')
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log(`✅ 市场数据获取成功`)
      console.log(`📊 市场数据:`)
      if (data.marketData) {
        console.log(`  当前价格: $${data.marketData.currentPrice}`)
        console.log(`  EMA89: $${data.marketData.ema89}`)
        console.log(`  价格距离: ${data.marketData.priceDistance}`)
        console.log(`  是否跌破EMA89: ${data.marketData.priceBelowEma}`)
      }
      console.log(`🎯 加仓倍数: ${data.multiplier?.value?.toFixed(2)}x`)
      
      return data.marketData
    } else {
      console.error(`❌ 获取市场数据失败: ${data.error}`)
      return false
    }
  } catch (error) {
    console.error(`❌ 检查市场数据失败: ${error.message}`)
    return false
  }
}

// 分析手动执行按钮状态
function analyzeManualExecuteButton(dcaSettings, marketData) {
  console.log('\n🔍 分析手动执行按钮状态...')
  
  const conditions = {
    loading: false,
    isActive: dcaSettings?.is_active || false,
    priceBelowEma: marketData?.priceBelowEma || false
  }
  
  console.log(`📊 按钮状态条件:`)
  console.log(`  加载中: ${conditions.loading}`)
  console.log(`  DCA激活: ${conditions.isActive}`)
  console.log(`  价格跌破EMA89: ${conditions.priceBelowEma}`)
  
  const isDisabled = conditions.loading || !conditions.isActive || !conditions.priceBelowEma
  
  console.log(`\n🎯 手动执行按钮状态: ${isDisabled ? '❌ 禁用' : '✅ 可用'}`)
  
  if (isDisabled) {
    console.log(`\n🔍 禁用原因:`)
    if (conditions.loading) {
      console.log(`  - 系统正在加载中`)
    }
    if (!conditions.isActive) {
      console.log(`  - DCA交易未激活`)
    }
    if (!conditions.priceBelowEma) {
      console.log(`  - 价格未跌破EMA89线`)
    }
  }
  
  return { isDisabled, conditions }
}

// 提供解决方案
function provideSolutions(dcaSettings, marketData, buttonAnalysis) {
  console.log('\n💡 解决方案:')
  
  if (!buttonAnalysis.conditions.isActive) {
    console.log(`\n1️⃣ 激活DCA交易:`)
    console.log(`   - 点击"启动DCA交易"按钮`)
    console.log(`   - 或检查DCA设置是否正确`)
  }
  
  if (!buttonAnalysis.conditions.priceBelowEma) {
    console.log(`\n2️⃣ 等待交易条件:`)
    console.log(`   - 当前价格: $${marketData?.currentPrice}`)
    console.log(`   - EMA89: $${marketData?.ema89}`)
    console.log(`   - 需要价格跌破EMA89线才能手动执行`)
    console.log(`   - 当前价格距离: ${marketData?.priceDistance}`)
  }
  
  if (buttonAnalysis.conditions.isActive && buttonAnalysis.conditions.priceBelowEma) {
    console.log(`\n✅ 手动执行按钮应该可用`)
    console.log(`   - DCA已激活`)
    console.log(`   - 价格已跌破EMA89`)
    console.log(`   - 可以点击"手动执行"按钮`)
  }
}

// 主函数
async function main() {
  console.log('🚀 开始检查DCA状态...')
  console.log('=' * 60)
  
  try {
    // 检查DCA设置
    const dcaSettings = await checkDCAStatus()
    if (!dcaSettings) {
      return false
    }
    
    // 检查市场数据
    const marketData = await checkMarketData()
    if (!marketData) {
      return false
    }
    
    // 分析按钮状态
    const buttonAnalysis = analyzeManualExecuteButton(dcaSettings, marketData)
    
    // 提供解决方案
    provideSolutions(dcaSettings, marketData, buttonAnalysis)
    
    console.log('\n' + '=' * 60)
    console.log('🎉 DCA状态检查完成！')
    
    return true
  } catch (error) {
    console.error(`❌ 检查失败: ${error.message}`)
    return false
  }
}

// 运行
main()
  .then(success => {
    if (success) {
      console.log('\n✅ 检查成功完成！')
    } else {
      console.log('\n❌ 检查失败')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error(`执行失败: ${error.message}`)
    process.exit(1)
  }) 