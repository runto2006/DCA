import { NextResponse } from 'next/server'
import { ExchangeManager } from '@/lib/exchanges/exchange-manager'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const exchange = searchParams.get('exchange')

    if (!exchange) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少交易所参数',
          message: '请指定要测试的交易所'
        },
        { status: 400 }
      )
    }

    const exchangeManager = await ExchangeManager.getInstance()
    const exchangeInstance = exchangeManager.getExchange(exchange)

    if (!exchangeInstance) {
      return NextResponse.json(
        {
          success: false,
          error: `交易所 ${exchange} 未配置或未初始化`,
          message: '请检查交易所配置'
        },
        { status: 404 }
      )
    }

    // 测试连接 - 尝试获取价格
    try {
      const price = await exchangeInstance.getPrice('SOLUSDT')
      
      return NextResponse.json({
        success: true,
        data: {
          exchange,
          price,
          status: 'connected',
          message: '连接测试成功'
        },
        message: `${exchange} 连接测试成功`
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '连接测试失败',
          data: {
            exchange,
            status: 'failed',
            message: '连接测试失败'
          },
          message: `${exchange} 连接测试失败`
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('交易所连接测试失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '连接测试失败'
      },
      { status: 500 }
    )
  }
} 