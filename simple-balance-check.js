require('dotenv').config({ path: '.env.local' })

console.log('🔍 开始检查DCA交易问题...')

// 检查环境变量
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY', 
  'BINANCE_API_KEY',
  'BINANCE_SECRET_KEY'
]

console.log('\n📋 环境变量检查:')
let missingVars = []
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`)
  } else {
    console.log(`❌ ${varName}: 未设置`)
    missingVars.push(varName)
  }
})

if (missingVars.length > 0) {
  console.log(`\n❌ 缺少环境变量: ${missingVars.join(', ')}`)
  console.log('请检查 .env.local 文件配置')
  process.exit(1)
}

console.log('\n✅ 所有环境变量已配置')

// 分析错误信息
console.log('\n🔍 错误分析:')
console.log('错误代码: -2010')
console.log('错误信息: "Account has insufficient balance for requested action."')
console.log('含义: 账户余额不足以执行请求的操作')

console.log('\n💡 可能的原因:')
console.log('1. USDT余额不足')
console.log('2. DCA设置的基础金额过高')
console.log('3. 最大订单数量设置过多')
console.log('4. 币安API权限不足')

console.log('\n🔧 解决方案:')
console.log('1. 检查币安账户USDT余额')
console.log('2. 减少DCA基础金额 (建议: 10-50 USDT)')
console.log('3. 减少最大订单数量 (建议: 3-5个)')
console.log('4. 确保币安API有交易权限')

console.log('\n📊 当前DCA设置分析:')
console.log('- SOL: 基础金额 100 USDT, 最大订单 6个')
console.log('- 总需求: 100 × 6 = 600 USDT')
console.log('- 如果余额 < 600 USDT，就会报错')

console.log('\n🎯 建议操作:')
console.log('1. 登录币安查看USDT余额')
console.log('2. 如果余额不足，请充值USDT')
console.log('3. 或者调整DCA设置减少资金需求')
console.log('4. 重新尝试手动执行DCA交易')

console.log('\n✅ 诊断完成！') 