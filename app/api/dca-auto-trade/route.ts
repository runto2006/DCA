import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  calculateDynamicDCAMultiplier, 
  calculateDCAOrders,
  getDCAMultiplierStrategy,
  type DCAMarketConditions 
} from '@/lib/dca-calculator'

// 币安API相关函数
function generateSignature(queryString: string, secret: string): string {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

// 获取30分钟K线数据
async function getBinanceKlines30m(symbol: string, limit: number = 200): Promise<any[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=30m&limit=${limit}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`获取K线数据失败: ${response.status}`)
  }
  
  const data = await response.json()
  return data.map((kline: any) => ({
    openTime: kline[0],
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
    closeTime: kline[6],
    quoteVolume: parseFloat(kline[7]),
    trades: kline[8],
    takerBuyBase: parseFloat(kline[9]),
    takerBuyQuote: parseFloat(kline[10])
  }))
}

// 计算EMA
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)
  
  // 第一个EMA值使用前period个收盘价的简单平均值
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema[period - 1] = sum / period
  
  // 计算后续的EMA值
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }
  
  return ema
}

// 计算RSI
function calculateRSI(prices: number[], period: number): number[] {
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  // 计算价格变化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  // 计算初始平均增益和损失
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period
  
  // 计算第一个RSI值
  const rs = avgGain / avgLoss
  rsi[period] = 100 - (100 / (1 + rs))
  
  // 计算后续RSI值
  for (let i = period + 1; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period
    
    const rs = avgGain / avgLoss
    rsi[i] = 100 - (100 / (1 + rs))
  }
  
  return rsi
}

// 计算MACD
function calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)
  
  const macd: number[] = []
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macd.push(fastEMA[i] - slowEMA[i])
  }
  
  const signal = calculateEMA(macd, signalPeriod)
  
  return { macd, signal }
}

// 计算OBV
function calculateOBV(prices: number[], volumes: number[]): number[] {
  const obv: number[] = [volumes[0]]
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      obv.push(obv[i - 1] + volumes[i])
    } else if (prices[i] < prices[i - 1]) {
      obv.push(obv[i - 1] - volumes[i])
    } else {
      obv.push(obv[i - 1])
    }
  }
  
  return obv
}

// 计算波动率
function calculateVolatility(prices: number[], period: number): number[] {
  const volatility: number[] = []
  
  for (let i = period; i < prices.length; i++) {
    const returns: number[] = []
    for (let j = i - period + 1; j <= i; j++) {
      returns.push((prices[j] - prices[j - 1]) / prices[j - 1])
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    
    volatility.push(stdDev * 100) // 转换为百分比
  }
  
  return volatility
}

// 检查交易权限
async function checkTradingPermissions(): Promise<boolean> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    return false
  }

  try {
    const timestamp = Date.now()
    const recvWindow = 60000 // 60秒的接收窗口
    const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
    const signature = generateSignature(queryString, apiSecret)
    
    const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    })

    return response.ok
  } catch (error) {
    console.error('检查交易权限失败:', error)
    return false
  }
}

// 检查账户余额
async function checkBalance(symbol: string, quantity: number, side: 'BUY' | 'SELL'): Promise<boolean> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const recvWindow = 60000 // 60秒的接收窗口
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
  const signature = generateSignature(queryString, apiSecret)
  
  const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`币安API请求失败: ${response.status}`)
  }

  const accountInfo = await response.json()
  
  if (side === 'BUY') {
    // 买入需要USDT余额
    const usdtBalance = accountInfo.balances.find((b: any) => b.asset === 'USDT')
    if (!usdtBalance || parseFloat(usdtBalance.free) < quantity) {
      throw new Error(`USDT余额不足，需要: ${quantity}，可用: ${usdtBalance?.free || '0'}`)
    }
  } else {
    // 卖出需要对应币种余额
    const assetBalance = accountInfo.balances.find((b: any) => b.asset === symbol.replace('USDT', ''))
    if (!assetBalance || parseFloat(assetBalance.free) < quantity) {
      throw new Error(`${symbol}余额不足，需要: ${quantity}，可用: ${assetBalance?.free || '0'}`)
    }
  }
  
  return true
}

// 创建币安订单
async function createBinanceOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price?: number
): Promise<any> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const recvWindow = 60000 // 60秒的接收窗口
  const orderType = price ? 'LIMIT' : 'MARKET'
  
  let queryString = `symbol=${symbol}&side=${side}&type=${orderType}&quantity=${quantity}&timestamp=${timestamp}&recvWindow=${recvWindow}`
  
  if (price) {
    queryString += `&price=${price}&timeInForce=GTC`
  }
  
  const signature = generateSignature(queryString, apiSecret)
  const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`币安交易API请求失败: ${response.status} - ${errorText}`)
  }

  return response.json()
}

// 获取当前价格
async function getCurrentPrice(symbol: string): Promise<number> {
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`获取价格失败: ${response.status}`)
  }
  
  const data = await response.json()
  return parseFloat(data.price)
}

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 检查DCA交易所需的总余额
async function checkDCABalance(symbol: string, amount: number, maxOrders: number): Promise<{
  hasEnoughBalance: boolean
  requiredAmount: number
  availableBalance: number
  balanceDetails: any[]
}> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const recvWindow = 60000
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
  const signature = generateSignature(queryString, apiSecret)
  
  const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`币安API请求失败: ${response.status}`)
  }

  const accountInfo = await response.json()
  
  // 获取USDT余额
  const usdtBalance = accountInfo.balances.find((b: any) => b.asset === 'USDT')
  const availableBalance = parseFloat(usdtBalance?.free || '0')
  
  // 计算DCA交易所需的总金额（考虑递增倍数）
  let totalRequired = 0
  const balanceDetails = []
  
  for (let i = 0; i < maxOrders; i++) {
    // 使用1.5倍递增计算每单金额
    const orderAmount = amount * Math.pow(1.5, i)
    totalRequired += orderAmount
    
    balanceDetails.push({
      orderNumber: i + 1,
      amount: orderAmount,
      cumulativeAmount: totalRequired
    })
  }
  
  return {
    hasEnoughBalance: availableBalance >= totalRequired,
    requiredAmount: totalRequired,
    availableBalance,
    balanceDetails
  }
}

// DCA自动交易API
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      action, // 'START', 'STOP', 'CHECK', 'EXECUTE'
      symbol = 'SOLUSDT',
      amount = 80,
      maxOrders = 6,
      priceDeviation = 1.5,
      takeProfit = 1.2,
      stopLoss = 5.0
    } = body

    console.log(`DCA自动交易请求: ${action}`, { symbol, amount, maxOrders })

    // 检查交易权限
    const canTrade = await checkTradingPermissions()
    if (!canTrade) {
      return NextResponse.json(
        { error: '账户没有交易权限或API配置错误' },
        { status: 403 }
      )
    }

    if (action === 'START') {
      // 启动DCA自动交易前检查余额
      console.log(`检查DCA交易余额: ${symbol}, 基础金额: ${amount}, 最大订单数: ${maxOrders}`)
      
      const balanceCheck = await checkDCABalance(symbol, amount, maxOrders)
      
      if (!balanceCheck.hasEnoughBalance) {
        return NextResponse.json({
          success: false,
          error: `余额不足，无法启动DCA交易`,
          details: {
            requiredAmount: balanceCheck.requiredAmount.toFixed(2),
            availableBalance: balanceCheck.availableBalance.toFixed(2),
            shortage: (balanceCheck.requiredAmount - balanceCheck.availableBalance).toFixed(2),
            balanceDetails: balanceCheck.balanceDetails
          }
        }, { status: 400 })
      }
      
      console.log(`余额检查通过: 需要 ${balanceCheck.requiredAmount.toFixed(2)} USDT, 可用 ${balanceCheck.availableBalance.toFixed(2)} USDT`)
      
      // 启动DCA自动交易 - 修复upsert操作
      const { data, error } = await supabase
        .from('dca_settings')
        .upsert({
          symbol,
          is_active: true,
          amount,
          max_orders: maxOrders,
          price_deviation: priceDeviation,
          take_profit: takeProfit,
          stop_loss: stopLoss,
          current_order: 0,
          total_invested: 0,
          last_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'symbol',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('DCA设置保存错误:', error)
        throw new Error(`保存DCA设置失败: ${error.message}`)
      }

      // 计算DCA网格详情
      const klines = await getBinanceKlines30m(symbol, 200)
      const currentPrice = klines[klines.length - 1].close
      const gridDetails = []
      let totalExpected = 0
      
      for (let i = 0; i < maxOrders; i++) {
        const orderAmount = amount * Math.pow(1.5, i)
        const priceDeviationPercent = priceDeviation * Math.pow(1.2, i)
        const targetPrice = currentPrice * (1 - priceDeviationPercent / 100)
        totalExpected += orderAmount
        
        gridDetails.push({
          orderNumber: i + 1,
          amount: orderAmount,
          targetPrice: targetPrice,
          priceDeviation: priceDeviationPercent,
          cumulativeAmount: totalExpected,
          status: '待执行'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'DCA自动交易已启动',
        settings: { symbol, amount, maxOrders, priceDeviation, takeProfit, stopLoss },
        balanceInfo: {
          requiredAmount: balanceCheck.requiredAmount.toFixed(2),
          availableBalance: balanceCheck.availableBalance.toFixed(2),
          balanceDetails: balanceCheck.balanceDetails
        },
        gridDetails: gridDetails,
        currentPrice: currentPrice,
        totalExpected: totalExpected.toFixed(2)
      })

    } else if (action === 'STOP') {
      // 停止DCA自动交易
      const { error } = await supabase
        .from('dca_settings')
        .update({ is_active: false })
        .eq('symbol', symbol)

      if (error) {
        throw new Error(`停止DCA交易失败: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'DCA自动交易已停止'
      })

    } else if (action === 'CHECK') {
      // 检查DCA交易状态
      const { data: settings, error } = await supabase
        .from('dca_settings')
        .select('*')
        .eq('symbol', symbol)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`获取DCA设置失败: ${error.message}`)
      }

      // 获取30分钟K线数据
      const klines = await getBinanceKlines30m(symbol, 200)
      const prices = klines.map(k => k.close)
      const currentPrice = prices[prices.length - 1]
      
      // 计算EMA89
      const ema89 = calculateEMA(prices, 89)
      const currentEma89 = ema89[ema89.length - 1]
      
      // 检查是否跌破EMA89
      const priceBelowEma = currentPrice < currentEma89
      const priceDistance = ((currentPrice - currentEma89) / currentEma89) * 100

      // 计算DCA网格详情
      let gridDetails = []
      let totalExpected = 0
      
      if (settings) {
        for (let i = 0; i < settings.max_orders; i++) {
          const orderAmount = settings.amount * Math.pow(1.5, i)
          const priceDeviationPercent = settings.price_deviation * Math.pow(1.2, i)
          const targetPrice = currentPrice * (1 - priceDeviationPercent / 100)
          totalExpected += orderAmount
          
          let status = '待执行'
          if (i < settings.current_order) {
            status = '已完成'
          } else if (i === settings.current_order) {
            status = '进行中'
          }
          
          gridDetails.push({
            orderNumber: i + 1,
            amount: orderAmount,
            targetPrice: targetPrice,
            priceDeviation: priceDeviationPercent,
            cumulativeAmount: totalExpected,
            status: status,
            executed: i < settings.current_order,
            current: i === settings.current_order
          })
        }
      }

      return NextResponse.json({
        success: true,
        dcaSettings: settings,
        marketData: {
          currentPrice,
          ema89: currentEma89,
          priceBelowEma,
          priceDistance: priceDistance.toFixed(2),
          lastUpdate: new Date().toISOString()
        },
        gridDetails: gridDetails,
        totalExpected: totalExpected.toFixed(2),
        progress: settings ? (settings.current_order / settings.max_orders) * 100 : 0
      })

    } else if (action === 'UPDATE_SETTINGS') {
      // 更新DCA设置
      const { error } = await supabase
        .from('dca_settings')
        .update({
          amount,
          max_orders: maxOrders,
          price_deviation: priceDeviation,
          take_profit: takeProfit,
          stop_loss: stopLoss,
          updated_at: new Date().toISOString()
        })
        .eq('symbol', symbol)

      if (error) {
        throw new Error(`更新DCA设置失败: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'DCA设置已更新',
        settings: { symbol, amount, maxOrders, priceDeviation, takeProfit, stopLoss }
      })

    } else if (action === 'EXECUTE') {
      // 执行DCA交易
      const { data: settings, error } = await supabase
        .from('dca_settings')
        .select('*')
        .eq('symbol', symbol)
        .eq('is_active', true)
        .single()

      if (error || !settings) {
        throw new Error('DCA设置不存在或未激活')
      }

      // 检查是否达到最大订单数
      if (settings.current_order >= settings.max_orders) {
        return NextResponse.json({
          success: false,
          message: '已达到最大订单数，DCA交易完成'
        })
      }

      // 获取30分钟K线数据
      const klines = await getBinanceKlines30m(symbol, 200)
      const prices = klines.map(k => k.close)
      const volumes = klines.map(k => k.volume)
      const currentPrice = prices[prices.length - 1]
      
      // 计算技术指标
      const ema89 = calculateEMA(prices, 89)
      const currentEma89 = ema89[ema89.length - 1]
      
      // 计算RSI
      const rsi = calculateRSI(prices, 14)
      const currentRsi = rsi[rsi.length - 1]
      
      // 计算MACD
      const macd = calculateMACD(prices, 12, 26, 9)
      const currentMacd = macd.macd[macd.macd.length - 1]
      const currentMacdSignal = macd.signal[macd.signal.length - 1]
      
      // 计算OBV
      const obv = calculateOBV(prices, volumes)
      const currentObv = obv[obv.length - 1]
      const prevObv = obv[obv.length - 2] || currentObv
      
      // 计算波动率
      const volatility = calculateVolatility(prices, 20)
      const currentVolatility = volatility[volatility.length - 1]
      
      // 计算价格位置（相对于历史高低点）
      const historicalHigh = Math.max(...prices.slice(-100))
      const historicalLow = Math.min(...prices.slice(-100))
      const pricePosition = ((currentPrice - historicalLow) / (historicalHigh - historicalLow)) * 100
      
      // 计算支撑阻力位
      const support = Math.min(...prices.slice(-20))
      const resistance = Math.max(...prices.slice(-20))
      
      // 检查是否跌破EMA89
      const priceBelowEma = currentPrice < currentEma89
      
      if (!priceBelowEma) {
        return NextResponse.json({
          success: false,
          message: '价格未跌破EMA89，不执行DCA交易',
          marketData: {
            currentPrice,
            ema89: currentEma89,
            priceBelowEma: false
          }
        })
      }
      
      // 构建市场条件
      const marketConditions: DCAMarketConditions = {
        currentPrice,
        ema89: currentEma89,
        rsi: currentRsi,
        volatility: currentVolatility,
        pricePosition,
        macd: currentMacd,
        macdSignal: currentMacdSignal,
        obv: currentObv,
        obvPrev: prevObv,
        support,
        resistance
      }
      
      // 计算动态加仓幅度
      const { multiplier, analysis } = calculateDynamicDCAMultiplier(marketConditions)
      
      // 计算DCA订单金额（动态递增）
      const orderAmount = settings.amount * Math.pow(multiplier, settings.current_order)
      
      console.log(`DCA交易 #${settings.current_order + 1}: 加仓倍数 ${multiplier.toFixed(2)}x, 订单金额 ${orderAmount.toFixed(2)} USDT`)
      
      // 检查余额
      await checkBalance(symbol, orderAmount, 'BUY')

      // 执行买入交易
      const orderResult = await createBinanceOrder(symbol, 'BUY', orderAmount)
      
      // 获取实际成交价格
      const actualPrice = await getCurrentPrice(symbol)
      const actualQuantity = parseFloat(orderResult.executedQty)
      const actualAmount = actualQuantity * actualPrice

      // 更新DCA设置
      const { error: updateError } = await supabase
        .from('dca_settings')
        .update({
          current_order: settings.current_order + 1,
          total_invested: settings.total_invested + actualAmount,
          last_check: new Date().toISOString()
        })
        .eq('symbol', symbol)

      if (updateError) {
        console.error('更新DCA设置失败:', updateError)
      }

      // 记录交易历史
      await supabase.from('trade_history').insert({
        symbol,
        trade_type: 'BUY',
        price: actualPrice,
        quantity: actualQuantity,
        total_amount: actualAmount,
        strategy_reason: `DCA自动交易 #${settings.current_order + 1} - 价格跌破EMA89`,
        notes: `EMA89: ${currentEma89.toFixed(2)}, 价格距离: ${((currentPrice - currentEma89) / currentEma89 * 100).toFixed(2)}%, 加仓倍数: ${multiplier.toFixed(2)}x, 分析: ${analysis}`
      })

      return NextResponse.json({
        success: true,
        message: `DCA交易执行成功 #${settings.current_order + 1}`,
        order: {
          orderId: orderResult.orderId,
          symbol: orderResult.symbol,
          side: orderResult.side,
          quantity: actualQuantity,
          price: actualPrice,
          amount: actualAmount,
          status: orderResult.status
        },
        dcaProgress: {
          currentOrder: settings.current_order + 1,
          maxOrders: settings.max_orders,
          totalInvested: settings.total_invested + actualAmount
        },
        multiplier: {
          value: multiplier,
          analysis: analysis
        }
      })

    } else {
      return NextResponse.json(
        { error: '无效的操作类型' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('DCA自动交易失败:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'DCA自动交易失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// 获取DCA交易状态
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'SOLUSDT'

    // 获取DCA设置
    const { data: settings, error } = await supabase
      .from('dca_settings')
      .select('*')
      .eq('symbol', symbol)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`获取DCA设置失败: ${error.message}`)
    }

    // 获取30分钟K线数据
    const klines = await getBinanceKlines30m(symbol, 200)
    const prices = klines.map(k => k.close)
    const volumes = klines.map(k => k.volume)
    const currentPrice = prices[prices.length - 1]
    
    // 计算技术指标
    const ema89 = calculateEMA(prices, 89)
    const currentEma89 = ema89[ema89.length - 1]
    
    // 计算RSI
    const rsi = calculateRSI(prices, 14)
    const currentRsi = rsi[rsi.length - 1]
    
    // 计算MACD
    const macd = calculateMACD(prices, 12, 26, 9)
    const currentMacd = macd.macd[macd.macd.length - 1]
    const currentMacdSignal = macd.signal[macd.signal.length - 1]
    
    // 计算OBV
    const obv = calculateOBV(prices, volumes)
    const currentObv = obv[obv.length - 1]
    const prevObv = obv[obv.length - 2] || currentObv
    
    // 计算波动率
    const volatility = calculateVolatility(prices, 20)
    const currentVolatility = volatility[volatility.length - 1]
    
    // 计算价格位置（相对于历史高低点）
    const historicalHigh = Math.max(...prices.slice(-100))
    const historicalLow = Math.min(...prices.slice(-100))
    const pricePosition = ((currentPrice - historicalLow) / (historicalHigh - historicalLow)) * 100
    
    // 计算支撑阻力位
    const support = Math.min(...prices.slice(-20))
    const resistance = Math.max(...prices.slice(-20))
    
    // 检查是否跌破EMA89
    const priceBelowEma = currentPrice < currentEma89
    const priceDistance = ((currentPrice - currentEma89) / currentEma89) * 100

    // 构建市场条件用于计算加仓倍数
    const marketConditions: DCAMarketConditions = {
      currentPrice,
      ema89: currentEma89,
      rsi: currentRsi,
      volatility: currentVolatility,
      pricePosition,
      macd: currentMacd,
      macdSignal: currentMacdSignal,
      obv: currentObv,
      obvPrev: prevObv,
      support,
      resistance
    }

    // 计算动态加仓幅度
    const { multiplier, analysis } = calculateDynamicDCAMultiplier(marketConditions)

    return NextResponse.json({
      success: true,
      dcaSettings: settings,
      marketData: {
        currentPrice,
        ema89: currentEma89,
        priceBelowEma,
        priceDistance: priceDistance.toFixed(2),
        lastUpdate: new Date().toISOString()
      },
      multiplier: {
        value: multiplier,
        analysis: analysis
      }
    })

  } catch (error) {
    console.error('获取DCA状态失败:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取DCA状态失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 