import { NextResponse } from 'next/server'
import crypto from 'crypto'

interface BinanceBalance {
  asset: string
  free: string
  locked: string
  total: string
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
  balances: BinanceBalance[]
}

// 生成币安API签名
function generateSignature(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

// 获取币安账户信息
async function getBinanceAccountInfo(): Promise<BinanceAccountInfo> {
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

  return response.json()
}

// 获取SOL和BTC的当前价格
async function getCurrentPrices(): Promise<{ SOL: number; BTC: number }> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=["SOLUSDT","BTCUSDT"]')
    const data = await response.json()
    
    let solPrice = 100
    let btcPrice = 45000
    
    data.forEach((item: any) => {
      if (item.symbol === 'SOLUSDT') {
        solPrice = parseFloat(item.price)
      } else if (item.symbol === 'BTCUSDT') {
        btcPrice = parseFloat(item.price)
      }
    })
    
    return { SOL: solPrice, BTC: btcPrice }
  } catch (error) {
    console.warn('获取价格失败，使用默认值:', error)
    return { SOL: 100, BTC: 45000 } // 默认价格
  }
}

export async function GET() {
  try {
    console.log('开始获取币安账户余额...')
    
    const accountInfo = await getBinanceAccountInfo()
    const prices = await getCurrentPrices()
    
    // 提取SOL和BTC余额
    const solBalance = accountInfo.balances.find(b => b.asset === 'SOL')
    const btcBalance = accountInfo.balances.find(b => b.asset === 'BTC')
    
    // 调试日志
    console.log('原始余额数据:', {
      SOL: {
        free: solBalance?.free,
        locked: solBalance?.locked,
        total: solBalance?.total
      },
      BTC: {
        free: btcBalance?.free,
        locked: btcBalance?.locked,
        total: btcBalance?.total
      },
      prices
    })
    
    const result = {
      timestamp: new Date().toISOString(),
      account: {
        canTrade: accountInfo.canTrade,
        canWithdraw: accountInfo.canWithdraw,
        canDeposit: accountInfo.canDeposit,
        updateTime: accountInfo.updateTime
      },
      balances: {
        SOL: {
          asset: 'SOL',
          free: parseFloat(solBalance?.free || '0'),
          locked: parseFloat(solBalance?.locked || '0'),
          total: parseFloat(solBalance?.free || '0') + parseFloat(solBalance?.locked || '0'),
          price: prices.SOL,
          value: (parseFloat(solBalance?.free || '0') + parseFloat(solBalance?.locked || '0')) * prices.SOL
        },
        BTC: {
          asset: 'BTC',
          free: parseFloat(btcBalance?.free || '0'),
          locked: parseFloat(btcBalance?.locked || '0'),
          total: parseFloat(btcBalance?.free || '0') + parseFloat(btcBalance?.locked || '0'),
          price: prices.BTC,
          value: (parseFloat(btcBalance?.free || '0') + parseFloat(btcBalance?.locked || '0')) * prices.BTC
        }
      },
      totalValue: ((parseFloat(solBalance?.free || '0') + parseFloat(solBalance?.locked || '0')) * prices.SOL) + 
                  ((parseFloat(btcBalance?.free || '0') + parseFloat(btcBalance?.locked || '0')) * prices.BTC)
    }
    
    console.log('处理后的余额数据:', {
      SOL: {
        free: result.balances.SOL.free,
        locked: result.balances.SOL.locked,
        total: result.balances.SOL.total,
        price: result.balances.SOL.price,
        value: result.balances.SOL.value
      },
      BTC: {
        free: result.balances.BTC.free,
        locked: result.balances.BTC.locked,
        total: result.balances.BTC.total,
        price: result.balances.BTC.price,
        value: result.balances.BTC.value
      },
      totalValue: result.totalValue
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('获取币安余额失败:', error)
    
    // 返回错误信息
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 