const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 币安API配置
const BINANCE_API_KEY = process.env.BINANCE_API_KEY
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET

// 生成签名
function generateSignature(queryString, secret) {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

// 获取币安账户余额
async function getBinanceBalance() {
  if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const recvWindow = 60000
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
  const signature = generateSignature(queryString, BINANCE_API_SECRET)
  
  const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': BINANCE_API_KEY,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`币安API请求失败: ${response.status} - ${errorText}`)
  }

  const accountInfo = await response.json()
  
  // 获取主要币种余额
  const balances = {
    USDT: parseFloat(accountInfo.balances.find(b => b.asset === 'USDT')?.free || '0'),
    SOL: parseFloat(accountInfo.balances.find(b => b.asset === 'SOL')?.free || '0'),
    BTC: parseFloat(accountInfo.balances.find(b => b.asset === 'BTC')?.free || '0'),
    ETH: parseFloat(accountInfo.balances.find(b => b.asset === 'ETH')?.free || '0')
  }
  
  return balances
}

// 计算DCA交易所需金额
function calculateDCARequirement(baseAmount, maxOrders, multiplier = 1.5) {
  let totalRequired = 0
  const orderDetails = []
  
  for (let i = 0; i < maxOrders; i++) {
    const orderAmount = baseAmount * Math.pow(multiplier, i)
    totalRequired += orderAmount
    
    orderDetails.push({
      orderNumber: i + 1,
      amount: orderAmount,
      cumulativeAmount: totalRequired
    })
  }
  
  return { totalRequired, orderDetails }
}

// 分析余额问题并提供解决方案
async function analyzeBalanceIssue() {
  console.log('🔍 分析DCA余额问题...\n')
  
  try {
    // 获取当前余额
    const balances = await getBinanceBalance()
    
    console.log('💰 当前账户余额:')
    console.log(`   USDT: $${balances.USDT.toFixed(2)}`)
    console.log(`   SOL: ${balances.SOL.toFixed(4)}`)
    console.log(`   BTC: ${balances.BTC.toFixed(8)}`)
    console.log(`   ETH: ${balances.ETH.toFixed(4)}`)
    
    // 分析不同DCA配置的余额需求
    const dcaConfigs = [
      { name: '保守型', baseAmount: 20, maxOrders: 4, multiplier: 1.2 },
      { name: '标准型', baseAmount: 50, maxOrders: 6, multiplier: 1.5 },
      { name: '激进型', baseAmount: 100, maxOrders: 8, multiplier: 1.8 }
    ]
    
    console.log('\n📊 DCA配置分析:')
    console.log('=' * 60)
    
    for (const config of dcaConfigs) {
      const { totalRequired, orderDetails } = calculateDCARequirement(
        config.baseAmount, 
        config.maxOrders, 
        config.multiplier
      )
      
      const canAfford = balances.USDT >= totalRequired
      const shortage = totalRequired - balances.USDT
      
      console.log(`\n${config.name}配置:`)
      console.log(`   基础金额: $${config.baseAmount}`)
      console.log(`   最大订单: ${config.maxOrders}`)
      console.log(`   递增倍数: ${config.multiplier}x`)
      console.log(`   所需总金额: $${totalRequired.toFixed(2)}`)
      console.log(`   余额状态: ${canAfford ? '✅ 充足' : '❌ 不足'}`)
      
      if (!canAfford) {
        console.log(`   差额: $${shortage.toFixed(2)}`)
      }
      
      // 显示订单详情
      console.log(`   订单详情:`)
      orderDetails.forEach(order => {
        console.log(`     第${order.orderNumber}单: $${order.amount.toFixed(2)} (累计: $${order.cumulativeAmount.toFixed(2)})`)
      })
    }
    
    // 提供解决方案
    console.log('\n💡 解决方案建议:')
    console.log('=' * 60)
    
    if (balances.USDT < 100) {
      console.log('1. 🔴 立即充值USDT:')
      console.log(`   建议充值至少 $200-500 USDT 用于DCA交易`)
      console.log(`   当前余额: $${balances.USDT.toFixed(2)}`)
      
      console.log('\n2. 🟡 使用小额配置:')
      console.log('   可以尝试以下小额配置:')
      console.log('   - 基础金额: $10, 最大订单: 3 (总需: $36.50)')
      console.log('   - 基础金额: $15, 最大订单: 4 (总需: $97.50)')
      console.log('   - 基础金额: $20, 最大订单: 3 (总需: $73.00)')
      
      console.log('\n3. 🟢 临时调整策略:')
      console.log('   - 降低基础订单金额')
      console.log('   - 减少最大订单数量')
      console.log('   - 使用更保守的递增倍数')
      
    } else if (balances.USDT < 500) {
      console.log('1. 🟡 当前余额可以支持小额DCA交易')
      console.log('2. 🟢 建议使用保守型或标准型配置')
      console.log('3. 🔵 可以考虑充值更多USDT以获得更好的交易效果')
      
    } else {
      console.log('1. 🟢 当前余额充足，可以正常进行DCA交易')
      console.log('2. 🎯 建议使用标准型配置开始交易')
      console.log('3. 📈 可以根据市场情况调整策略')
    }
    
    // 检查其他币种余额
    const totalValue = balances.SOL + balances.BTC + balances.ETH
    if (totalValue > 0) {
      console.log('\n💱 其他币种余额:')
      console.log('   如果其他币种余额较多，可以考虑:')
      console.log('   1. 将部分币种转换为USDT')
      console.log('   2. 使用币安现货交易功能')
      console.log('   3. 等待币价上涨后卖出')
    }
    
    console.log('\n✅ 余额分析完成！')
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message)
    
    if (error.message.includes('API密钥未配置')) {
      console.log('\n💡 解决方案:')
      console.log('1. 检查 .env.local 文件中的币安API配置')
      console.log('2. 确认 BINANCE_API_KEY 和 BINANCE_API_SECRET 正确')
      console.log('3. 验证API密钥具有账户信息读取权限')
    }
  }
}

// 生成小额DCA配置建议
function generateSmallDCAConfigs() {
  console.log('\n📋 小额DCA配置建议:')
  console.log('=' * 60)
  
  const smallConfigs = [
    { baseAmount: 5, maxOrders: 3, multiplier: 1.2 },
    { baseAmount: 10, maxOrders: 3, multiplier: 1.3 },
    { baseAmount: 15, maxOrders: 4, multiplier: 1.4 },
    { baseAmount: 20, maxOrders: 4, multiplier: 1.5 },
    { baseAmount: 25, maxOrders: 5, multiplier: 1.4 },
    { baseAmount: 30, maxOrders: 5, multiplier: 1.5 }
  ]
  
  for (const config of smallConfigs) {
    const { totalRequired, orderDetails } = calculateDCARequirement(
      config.baseAmount, 
      config.maxOrders, 
      config.multiplier
    )
    
    console.log(`\n💰 配置: $${config.baseAmount} × ${config.maxOrders}单 (${config.multiplier}x递增)`)
    console.log(`   总需金额: $${totalRequired.toFixed(2)}`)
    console.log(`   订单详情:`)
    orderDetails.forEach(order => {
      console.log(`     ${order.orderNumber}. $${order.amount.toFixed(2)}`)
    })
  }
}

// 运行分析
if (require.main === module) {
  console.log('🚀 DCA余额问题分析工具\n')
  
  analyzeBalanceIssue()
    .then(() => {
      generateSmallDCAConfigs()
      console.log('\n🎯 分析完成！请根据建议调整DCA配置或充值账户。')
    })
    .catch(error => {
      console.error('❌ 分析失败:', error.message)
    })
}

module.exports = {
  analyzeBalanceIssue,
  generateSmallDCAConfigs,
  calculateDCARequirement
} 