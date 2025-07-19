import { NextResponse } from 'next/server'
import crypto from 'crypto'

interface BinanceOrderResponse {
  symbol: string
  orderId: number
  orderListId: number
  clientOrderId: string
  transactTime: number
  price: string
  origQty: string
  executedQty: string
  cummulativeQuoteQty: string
  status: string
  timeInForce: string
  type: string
  side: string
  fills: Array<{
    price: string
    qty: string
    commission: string
    commissionAsset: string
  }>
}

interface BinanceAccountInfo {
  makerCommission: number
  takerCommission: number
  buyerCommission: number
  sellerCommission: number
  canTrade: boolean
  canWithdraw: boolean
  canDeposit: boolean
  updateTime: number
  accountType: string
  balances: Array<{
    asset: string
    free: string
    locked: string
  }>
}

// 生成币安API签名
function generateSignature(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

// 检查交易权限
async function checkTradingPermissions(): Promise<boolean> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const queryString = `timestamp=${timestamp}`
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
    const errorText = await response.text()
    throw new Error(`币安API请求失败: ${response.status} - ${errorText}`)
  }

  const accountInfo: BinanceAccountInfo = await response.json()
  return accountInfo.canTrade
}

// 检查账户余额
async function checkBalance(symbol: string, quantity: number, side: 'BUY' | 'SELL'): Promise<boolean> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const queryString = `timestamp=${timestamp}`
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
    const errorText = await response.text()
    throw new Error(`币安API请求失败: ${response.status} - ${errorText}`)
  }

  const accountInfo: BinanceAccountInfo = await response.json()
  
  if (side === 'BUY') {
    // 买入需要USDT余额
    const usdtBalance = accountInfo.balances.find(b => b.asset === 'USDT')
    if (!usdtBalance || parseFloat(usdtBalance.free) < quantity) {
      throw new Error(`USDT余额不足，需要: ${quantity}，可用: ${usdtBalance?.free || '0'}`)
    }
  } else {
    // 卖出需要对应币种余额
    const assetBalance = accountInfo.balances.find(b => b.asset === symbol)
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
): Promise<BinanceOrderResponse> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    throw new Error('币安API密钥未配置')
  }

  const timestamp = Date.now()
  const orderType = price ? 'LIMIT' : 'MARKET'
  
  let queryString = `symbol=${symbol}&side=${side}&type=${orderType}&quantity=${quantity}&timestamp=${timestamp}`
  
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
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const data = await response.json()
    return parseFloat(data.price)
  } catch (error) {
    throw new Error(`获取价格失败: ${error}`)
  }
}

// 交易API
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { symbol, side, quantity, price, strategy_reason } = body

    // 验证必填字段
    if (!symbol || !side || !quantity) {
      return NextResponse.json(
        { error: '缺少必填字段: symbol, side, quantity' },
        { status: 400 }
      )
    }

    // 验证交易方向
    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json(
        { error: '无效的交易方向，必须是 BUY 或 SELL' },
        { status: 400 }
      )
    }

    // 验证数量
    if (quantity <= 0) {
      return NextResponse.json(
        { error: '交易数量必须大于0' },
        { status: 400 }
      )
    }

    console.log(`开始执行${side}交易: ${symbol} ${quantity}${price ? ` @ ${price}` : ''}`)

    // 1. 检查交易权限
    const canTrade = await checkTradingPermissions()
    if (!canTrade) {
      return NextResponse.json(
        { error: '账户没有交易权限' },
        { status: 403 }
      )
    }

    // 2. 检查余额
    await checkBalance(symbol, quantity, side)

    // 3. 执行交易
    const orderResult = await createBinanceOrder(symbol, side, quantity, price)
    
    // 4. 获取实际成交价格
    const actualPrice = price || await getCurrentPrice(symbol)
    
    // 5. 计算实际成交金额
    const actualQuantity = parseFloat(orderResult.executedQty)
    const actualAmount = actualQuantity * actualPrice

    console.log('交易执行成功:', {
      orderId: orderResult.orderId,
      symbol: orderResult.symbol,
      side: orderResult.side,
      quantity: actualQuantity,
      price: actualPrice,
      amount: actualAmount,
      status: orderResult.status
    })

    return NextResponse.json({
      success: true,
      orderId: orderResult.orderId,
      symbol: orderResult.symbol,
      side: orderResult.side,
      quantity: actualQuantity,
      price: actualPrice,
      amount: actualAmount,
      status: orderResult.status,
      timestamp: new Date().toISOString(),
      strategy_reason: strategy_reason || '手动交易'
    })

  } catch (error) {
    console.error('交易执行失败:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '交易执行失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// 获取交易权限状态
export async function GET() {
  try {
    const canTrade = await checkTradingPermissions()
    
    return NextResponse.json({
      canTrade,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('检查交易权限失败:', error)
    
    return NextResponse.json(
      { 
        canTrade: false,
        error: error instanceof Error ? error.message : '检查交易权限失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 