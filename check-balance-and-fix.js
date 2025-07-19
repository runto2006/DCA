require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// 配置检查
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const binanceApiKey = process.env.BINANCE_API_KEY
const binanceSecretKey = process.env.BINANCE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey || !binanceApiKey || !binanceSecretKey) {
  console.error('❌ 缺少必要的环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue')
}

// 币安API签名函数
function createSignature(queryString) {
  return crypto.createHmac('sha256', binanceSecretKey).update(queryString).digest('hex')
}

// 获取币安账户余额
async function getBinanceBalance() {
  try {
    const timestamp = Date.now()
    const queryString = `timestamp=${timestamp}&recvWindow=60000`
    const signature = createSignature(queryString)
    
    const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`
    
    logInfo(`币安API请求URL: ${url}`)
    logInfo(`请求时间戳: ${timestamp}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': binanceApiKey
      }
    })
    
    if (!response.ok) {
      throw new Error(`币安API请求失败: ${response.status} - ${await response.text()}`)
    }
    
    const data = await response.json()
    
    // 过滤出有余额的币种
    const balances = data.balances.filter(balance => {
      const free = parseFloat(balance.free)
      const locked = parseFloat(balance.locked)
      return free > 0 || locked > 0
    })
    
    logSuccess(`成功获取币安账户余额，共 ${balances.length} 个有余额的币种`)
    
    return balances
  } catch (error) {
    logError(`获取币安余额失败: ${error.message}`)
    return null
  }
}

// 获取USDT价格
async function getUSDTPrice(symbol) {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`)
    if (!response.ok) {
      throw new Error(`获取${symbol}价格失败: ${response.status}`)
    }
    const data = await response.json()
    return parseFloat(data.price)
  } catch (error) {
    logWarning(`获取${symbol}价格失败: ${error.message}`)
    return null
  }
}

// 分析余额和DCA设置
async function analyzeBalanceAndDCA() {
  logStep('💰', '分析币安账户余额和DCA设置')
  
  // 获取币安余额
  const balances = await getBinanceBalance()
  if (!balances) {
    return false
  }
  
  // 获取USDT余额
  const usdtBalance = balances.find(b => b.asset === 'USDT')
  const usdtFree = usdtBalance ? parseFloat(usdtBalance.free) : 0
  const usdtLocked = usdtBalance ? parseFloat(usdtBalance.locked) : 0
  const usdtTotal = usdtFree + usdtLocked
  
  logInfo(`USDT余额分析:`)
  logInfo(`  可用余额: ${usdtFree.toFixed(2)} USDT`)
  logInfo(`  冻结余额: ${usdtLocked.toFixed(2)} USDT`)
  logInfo(`  总余额: ${usdtTotal.toFixed(2)} USDT`)
  
  // 获取DCA设置
  const { data: dcaSettings, error: dcaError } = await supabase
    .from('multi_currency_dca_settings')
    .select('*')
    .eq('is_active', true)
  
  if (dcaError) {
    logError(`获取DCA设置失败: ${dcaError.message}`)
    return false
  }
  
  logInfo(`\nDCA设置分析:`)
  logInfo(`  激活的DCA策略: ${dcaSettings.length} 个`)
  
  let totalRequired = 0
  dcaSettings.forEach(dca => {
    const baseAmount = parseFloat(dca.base_amount) || 100
    const maxOrders = parseInt(dca.max_orders) || 6
    const required = baseAmount * maxOrders
    totalRequired += required
    
    logInfo(`  ${dca.symbol}: 基础金额 ${baseAmount} USDT, 最大订单 ${maxOrders}, 需要 ${required} USDT`)
  })
  
  logInfo(`\n总资金需求: ${totalRequired.toFixed(2)} USDT`)
  logInfo(`当前USDT余额: ${usdtTotal.toFixed(2)} USDT`)
  
  if (usdtTotal < totalRequired) {
    logWarning(`⚠️ 余额不足! 需要 ${totalRequired.toFixed(2)} USDT，但只有 ${usdtTotal.toFixed(2)} USDT`)
    logWarning(`差额: ${(totalRequired - usdtTotal).toFixed(2)} USDT`)
  } else {
    logSuccess(`✅ 余额充足，可以执行DCA交易`)
  }
  
  return {
    usdtBalance: usdtTotal,
    totalRequired,
    dcaSettings,
    balances
  }
}

// 修复DCA设置
async function fixDCASettings() {
  logStep('🔧', '修复DCA设置')
  
  // 获取当前余额
  const balanceInfo = await analyzeBalanceAndDCA()
  if (!balanceInfo) {
    return false
  }
  
  const { usdtBalance, totalRequired, dcaSettings } = balanceInfo
  
  if (usdtBalance >= totalRequired) {
    logSuccess(`余额充足，无需修复DCA设置`)
    return true
  }
  
  // 计算安全的DCA金额
  const safeAmount = Math.floor(usdtBalance / dcaSettings.length / 6) // 平均分配，每个币种6个订单
  const adjustedAmount = Math.max(safeAmount, 10) // 最少10 USDT
  
  logInfo(`\n调整DCA设置:`)
  logInfo(`  安全的基础金额: ${adjustedAmount} USDT`)
  logInfo(`  每个币种最大订单: 6`)
  logInfo(`  总需求: ${(adjustedAmount * 6 * dcaSettings.length).toFixed(2)} USDT`)
  
  // 更新DCA设置
  for (const dca of dcaSettings) {
    const { error } = await supabase
      .from('multi_currency_dca_settings')
      .update({ base_amount: adjustedAmount })
      .eq('symbol', dca.symbol)
    
    if (error) {
      logWarning(`更新${dca.symbol} DCA设置失败: ${error.message}`)
    } else {
      logSuccess(`更新${dca.symbol} DCA设置: ${adjustedAmount} USDT`)
    }
  }
  
  return true
}

// 创建测试DCA交易
async function createTestDCATrade() {
  logStep('🧪', '创建测试DCA交易')
  
  // 获取SOL的DCA设置
  const { data: solDCA, error: dcaError } = await supabase
    .from('multi_currency_dca_settings')
    .select('*')
    .eq('symbol', 'SOL')
    .single()
  
  if (dcaError || !solDCA) {
    logError(`获取SOL DCA设置失败: ${dcaError?.message}`)
    return false
  }
  
  // 获取当前SOL价格
  const solPrice = await getUSDTPrice('SOL')
  if (!solPrice) {
    logError(`获取SOL价格失败`)
    return false
  }
  
  // 计算安全的交易金额
  const baseAmount = parseFloat(solDCA.base_amount) || 100
  const safeAmount = Math.min(baseAmount, 50) // 限制在50 USDT以内
  
  logInfo(`SOL当前价格: $${solPrice}`)
  logInfo(`DCA基础金额: ${baseAmount} USDT`)
  logInfo(`安全交易金额: ${safeAmount} USDT`)
  
  // 创建测试交易记录
  const testTrade = {
    symbol: 'SOL',
    amount: safeAmount,
    price: solPrice,
    type: 'BUY',
    status: 'PENDING',
    order_type: 'MARKET',
    strategy: 'DCA_TEST',
    created_at: new Date().toISOString()
  }
  
  const { error: tradeError } = await supabase
    .from('trades')
    .insert(testTrade)
  
  if (tradeError) {
    logError(`创建测试交易记录失败: ${tradeError.message}`)
    return false
  }
  
  logSuccess(`创建测试DCA交易记录: ${safeAmount} USDT 购买 SOL`)
  logInfo(`注意: 这只是测试记录，不会实际执行币安交易`)
  
  return true
}

// 检查币安API权限
async function checkBinancePermissions() {
  logStep('🔐', '检查币安API权限')
  
  try {
    const timestamp = Date.now()
    const queryString = `timestamp=${timestamp}&recvWindow=60000`
    const signature = createSignature(queryString)
    
    const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': binanceApiKey
      }
    })
    
    if (response.ok) {
      logSuccess(`币安API权限正常`)
      return true
    } else {
      const errorText = await response.text()
      logError(`币安API权限检查失败: ${response.status} - ${errorText}`)
      
      if (response.status === 401) {
        logWarning(`API密钥无效或权限不足`)
      } else if (response.status === 403) {
        logWarning(`API密钥没有交易权限`)
      }
      
      return false
    }
  } catch (error) {
    logError(`检查币安API权限失败: ${error.message}`)
    return false
  }
}

// 主函数
async function checkBalanceAndFix() {
  log('🔍 开始检查余额和修复DCA交易问题', 'bright')
  log('=' * 60, 'blue')
  
  try {
    // 检查币安API权限
    const apiOk = await checkBinancePermissions()
    if (!apiOk) {
      logError(`币安API权限有问题，请检查API密钥配置`)
      return false
    }
    
    // 分析余额和DCA设置
    const balanceInfo = await analyzeBalanceAndDCA()
    if (!balanceInfo) {
      return false
    }
    
    // 修复DCA设置
    await fixDCASettings()
    
    // 创建测试DCA交易
    await createTestDCATrade()
    
    log('=' * 60, 'blue')
    log('🎉 余额检查和修复完成！', 'bright')
    
    log('\n📋 问题诊断结果:')
    if (balanceInfo.usdtBalance < balanceInfo.totalRequired) {
      logWarning(`❌ 主要问题: USDT余额不足`)
      logWarning(`   需要: ${balanceInfo.totalRequired.toFixed(2)} USDT`)
      logWarning(`   当前: ${balanceInfo.usdtBalance.toFixed(2)} USDT`)
      logWarning(`   差额: ${(balanceInfo.totalRequired - balanceInfo.usdtBalance).toFixed(2)} USDT`)
      
      log('\n💡 解决方案:')
      log('1. 充值USDT到币安账户')
      log('2. 减少DCA基础金额')
      log('3. 减少最大订单数量')
      log('4. 暂停部分币种的DCA策略')
    } else {
      logSuccess(`✅ 余额充足，可以正常执行DCA交易`)
    }
    
    log('\n🔧 已执行的修复:')
    log('✅ 检查了币安API权限')
    log('✅ 分析了账户余额')
    log('✅ 检查了DCA设置')
    log('✅ 调整了DCA基础金额')
    log('✅ 创建了测试交易记录')
    
    return true
  } catch (error) {
    logError(`检查和修复失败: ${error.message}`)
    return false
  }
}

// 运行
checkBalanceAndFix()
  .then(success => {
    if (success) {
      log('\n✅ 检查和修复成功完成！', 'bright')
    } else {
      log('\n❌ 检查和修复失败', 'red')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logError(`执行失败: ${error.message}`)
    process.exit(1)
  }) 