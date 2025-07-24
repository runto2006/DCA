import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

// 生成币安API签名
function generateSignature(queryString: string, secret: string): string {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex')
}

// 向币安发送取消订单请求
async function cancelBinanceOrder(symbol: string, orderId: string): Promise<boolean> {
  const apiKey = process.env.BINANCE_API_KEY
  const apiSecret = process.env.BINANCE_API_SECRET
  
  if (!apiKey || !apiSecret) {
    console.warn('币安API密钥未配置，跳过币安取消订单')
    return false
  }

  try {
    const timestamp = Date.now()
    const recvWindow = 60000
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}&recvWindow=${recvWindow}`
    const signature = generateSignature(queryString, apiSecret)
    
    const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`
    
    console.log(`🔄 向币安发送取消订单请求: ${symbol} - ${orderId}`)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ 币安取消订单成功:`, result)
      return true
    } else {
      const errorData = await response.json()
      console.error(`❌ 币安取消订单失败: ${response.status} -`, errorData)
      return false
    }
  } catch (error) {
    console.error('❌ 币安取消订单请求失败:', error)
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const positionId = parseInt(params.id)
    
    if (isNaN(positionId)) {
      return NextResponse.json(
        { error: '无效的持仓ID' },
        { status: 400 }
      )
    }

    // 检查持仓是否存在且状态为活跃
    const positionResult = await query(
      'SELECT * FROM user_positions WHERE id = $1 AND status = $2',
      [positionId, 'ACTIVE']
    )

    if (positionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '持仓不存在或状态不正确' },
        { status: 404 }
      )
    }

    const position = positionResult.rows[0]

    // 检查是否为限价订单待成交（没有入场时间）
    if (position.entry_date) {
      return NextResponse.json(
        { error: '只能取消未成交的限价订单' },
        { status: 400 }
      )
    }

    // 尝试向币安发送取消订单请求
    let binanceCancelSuccess = false
    if (position.binance_order_id) {
      binanceCancelSuccess = await cancelBinanceOrder(position.symbol, position.binance_order_id)
    } else {
      console.warn(`⚠️ 持仓 ${positionId} 没有币安订单ID，跳过币安取消`)
    }

    // 删除持仓记录
    await query(
      'DELETE FROM user_positions WHERE id = $1',
      [positionId]
    )

    console.log(`✅ 限价订单已取消: ID ${positionId}`)

    return NextResponse.json({
      message: '限价订单已成功取消',
      positionId: positionId,
      binanceCancelSuccess: binanceCancelSuccess,
      details: {
        symbol: position.symbol,
        orderId: position.binance_order_id,
        binanceCanceled: binanceCancelSuccess
      }
    })

  } catch (error) {
    console.error('❌ 取消订单失败:', error)
    return NextResponse.json(
      { error: '取消订单失败，请重试' },
      { status: 500 }
    )
  }
} 

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const positionId = params.id
    
    // 模拟取消持仓
    const cancelledPosition = {
      id: parseInt(positionId),
      status: 'CANCELLED',
      exit_date: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: cancelledPosition,
      message: '持仓取消成功'
    })
  } catch (error) {
    console.error('❌ 取消持仓失败:', error)
    return NextResponse.json(
      { success: false, error: '取消持仓失败' },
      { status: 500 }
    )
  }
} 