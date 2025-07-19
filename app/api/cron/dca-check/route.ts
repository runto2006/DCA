import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// DCA定时检查API
export async function GET(request: Request) {
  try {
    console.log('开始DCA定时检查...')
    
    // 检查交易权限
    const canTrade = await checkTradingPermissions()
    if (!canTrade) {
      return NextResponse.json(
        { error: '账户没有交易权限或API配置错误' },
        { status: 403 }
      )
    }

    // 获取所有活跃的DCA设置
    const { data: dcaSettings, error } = await supabase
      .from('dca_settings')
      .select('*')
      .eq('is_active', true)

    if (error) {
      throw new Error(`获取DCA设置失败: ${error.message}`)
    }

    if (!dcaSettings || dcaSettings.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有活跃的DCA交易设置',
        checkedAt: new Date().toISOString()
      })
    }

    const results = []

    // 检查每个DCA设置
    for (const setting of dcaSettings) {
      try {
        console.log(`检查DCA设置: ${setting.symbol}`)

        // 检查是否达到最大订单数
        if (setting.current_order >= setting.max_orders) {
          console.log(`${setting.symbol}: 已达到最大订单数，跳过`)
          results.push({
            symbol: setting.symbol,
            status: 'COMPLETED',
            message: '已达到最大订单数'
          })
          continue
        }

        // 获取30分钟K线数据
        const klines = await getBinanceKlines30m(setting.symbol, 200)
        const prices = klines.map(k => k.close)
        const currentPrice = prices[prices.length - 1]
        
        // 计算EMA89
        const ema89 = calculateEMA(prices, 89)
        const currentEma89 = ema89[ema89.length - 1]
        
        // 检查是否跌破EMA89
        const priceBelowEma = currentPrice < currentEma89
        const priceDistance = ((currentPrice - currentEma89) / currentEma89) * 100

        console.log(`${setting.symbol}: 当前价格 ${currentPrice}, EMA89 ${currentEma89}, 价格距离 ${priceDistance.toFixed(2)}%`)

        if (!priceBelowEma) {
          console.log(`${setting.symbol}: 价格未跌破EMA89，不执行交易`)
          results.push({
            symbol: setting.symbol,
            status: 'SKIPPED',
            message: '价格未跌破EMA89',
            marketData: {
              currentPrice,
              ema89: currentEma89,
              priceDistance: priceDistance.toFixed(2)
            }
          })
          continue
        }

        // 计算DCA订单金额（递增）
        const orderAmount = setting.amount * Math.pow(1.5, setting.current_order)
        
        console.log(`${setting.symbol}: 准备执行DCA交易，订单金额 ${orderAmount} USDT`)

        // 检查余额
        await checkBalance(setting.symbol, orderAmount, 'BUY')

        // 执行买入交易
        const orderResult = await createBinanceOrder(setting.symbol, 'BUY', orderAmount)
        
        // 获取实际成交价格
        const actualPrice = await getCurrentPrice(setting.symbol)
        const actualQuantity = parseFloat(orderResult.executedQty)
        const actualAmount = actualQuantity * actualPrice

        console.log(`${setting.symbol}: DCA交易执行成功，订单ID ${orderResult.orderId}`)

        // 更新DCA设置
        const { error: updateError } = await supabase
          .from('dca_settings')
          .update({
            current_order: setting.current_order + 1,
            total_invested: setting.total_invested + actualAmount,
            last_check: new Date().toISOString()
          })
          .eq('symbol', setting.symbol)

        if (updateError) {
          console.error(`更新DCA设置失败: ${updateError.message}`)
        }

        // 记录交易历史
        await supabase.from('trade_history').insert({
          symbol: setting.symbol,
          trade_type: 'BUY',
          price: actualPrice,
          quantity: actualQuantity,
          total_amount: actualAmount,
          strategy_reason: `DCA自动交易 #${setting.current_order + 1} - 价格跌破EMA89`,
          notes: `EMA89: ${currentEma89.toFixed(2)}, 价格距离: ${priceDistance.toFixed(2)}%, 定时任务执行`
        })

        results.push({
          symbol: setting.symbol,
          status: 'EXECUTED',
          message: `DCA交易执行成功 #${setting.current_order + 1}`,
          order: {
            orderId: orderResult.orderId,
            quantity: actualQuantity,
            price: actualPrice,
            amount: actualAmount
          },
          marketData: {
            currentPrice,
            ema89: currentEma89,
            priceDistance: priceDistance.toFixed(2)
          }
        })

      } catch (error) {
        console.error(`处理DCA设置 ${setting.symbol} 失败:`, error)
        results.push({
          symbol: setting.symbol,
          status: 'ERROR',
          message: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'DCA定时检查完成',
      results,
      checkedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('DCA定时检查失败:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'DCA定时检查失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 