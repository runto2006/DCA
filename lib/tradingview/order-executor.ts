import { TradeSignal } from './signal-types'
import { ExchangeManager } from '../exchanges/exchange-manager'
import { ExchangeInterface, OrderRequest, OrderResult } from '../exchanges/base'
import { query } from '../database'

export interface ExecutionResult {
  success: boolean
  orderId?: string
  error?: string
  details?: any
}

export class TradingViewOrderExecutor {
  private exchangeManager: ExchangeManager | null = null
  
  constructor() {
    this.initializeExchangeManager()
  }

  private async initializeExchangeManager() {
    try {
      this.exchangeManager = await ExchangeManager.getInstance()
    } catch (error) {
      console.error('初始化交易所管理器失败:', error)
    }
  }
  
  async executeTradeSignal(signal: TradeSignal): Promise<ExecutionResult> {
    // 确保交易所管理器已初始化
    if (!this.exchangeManager) {
      await this.initializeExchangeManager()
    }

    try {
      console.log('🚀 开始执行交易信号:', signal)
      
      // 获取交易所适配器
      const exchange = this.exchangeManager?.getExchange(signal.exchange)
      if (!exchange) {
        throw new Error(`交易所 ${signal.exchange} 不可用`)
      }
      
      // 执行主订单
      const mainOrder = await this.executeMainOrder(exchange, signal)
      
      // 执行止损订单
      const stopLossOrder = signal.stopLoss ? 
        await this.executeStopLossOrder(exchange, signal, mainOrder) : null
      
      // 执行止盈订单
      const takeProfitOrder = signal.takeProfit ? 
        await this.executeTakeProfitOrder(exchange, signal, mainOrder) : null
      
      // 记录交易
      await this.recordTrade(signal, mainOrder, stopLossOrder, takeProfitOrder)
      
      console.log('✅ 交易信号执行完成')
      
      return {
        success: true,
        mainOrder,
        stopLossOrder,
        takeProfitOrder,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('❌ 订单执行失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now()
      }
    }
  }
  
  private async executeMainOrder(exchange: ExchangeInterface, signal: TradeSignal): Promise<OrderResult> {
    console.log(`📊 执行主订单: ${signal.action} ${signal.quantity} ${signal.symbol}`)
    
    // 处理CLOSE操作
    const side = signal.action === 'CLOSE' ? 'SELL' : signal.action
    
    const orderRequest: OrderRequest = {
      symbol: signal.symbol,
      side: side as 'BUY' | 'SELL',
      type: signal.orderType,
      quantity: signal.quantity,
      price: signal.price,
      timeInForce: 'GTC'
    }
    
    if (signal.leverage && signal.leverage > 1) {
      // 设置杠杆 - 暂时跳过，因为接口中没有定义
      console.log(`⚡ 跳过设置杠杆: ${signal.leverage}x (接口未实现)`)
    }
    
    const result = await exchange.placeOrder(orderRequest)
    console.log('✅ 主订单执行成功:', result)
    
    return result
  }
  
  private async executeStopLossOrder(
    exchange: ExchangeInterface, 
    signal: TradeSignal, 
    mainOrder: OrderResult
  ): Promise<OrderResult | null> {
    if (!signal.stopLoss) return null
    
    console.log(`🛑 执行止损订单: ${signal.stopLoss}`)
    
    const stopOrderRequest: OrderRequest = {
      symbol: signal.symbol,
      side: signal.action === 'BUY' ? 'SELL' : 'BUY',
      type: 'STOP_MARKET',
      quantity: signal.quantity,
      stopPrice: signal.stopLoss,
      timeInForce: 'GTC'
    }
    
    try {
      const result = await exchange.placeOrder(stopOrderRequest)
      console.log('✅ 止损订单执行成功:', result)
      return result
    } catch (error) {
      console.error('❌ 止损订单执行失败:', error)
      return null
    }
  }
  
  private async executeTakeProfitOrder(
    exchange: ExchangeInterface, 
    signal: TradeSignal, 
    mainOrder: OrderResult
  ): Promise<OrderResult | null> {
    if (!signal.takeProfit) return null
    
    console.log(`🎯 执行止盈订单: ${signal.takeProfit}`)
    
    const takeProfitOrderRequest: OrderRequest = {
      symbol: signal.symbol,
      side: signal.action === 'BUY' ? 'SELL' : 'BUY',
      type: 'LIMIT',
      quantity: signal.quantity,
      price: signal.takeProfit,
      timeInForce: 'GTC'
    }
    
    try {
      const result = await exchange.placeOrder(takeProfitOrderRequest)
      console.log('✅ 止盈订单执行成功:', result)
      return result
    } catch (error) {
      console.error('❌ 止盈订单执行失败:', error)
      return null
    }
  }
  
  private async recordTrade(
    signal: TradeSignal,
    mainOrder: OrderResult,
    stopLossOrder: OrderResult | null,
    takeProfitOrder: OrderResult | null
  ): Promise<void> {
    try {
      // 记录主订单
      await query(`
        INSERT INTO trade_history (
          symbol,
          side,
          quantity,
          price,
          order_id,
          exchange,
          strategy,
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        signal.symbol,
        signal.action,
        mainOrder.executedQuantity || signal.quantity,
        mainOrder.averagePrice || signal.price || 0,
        mainOrder.orderId,
        signal.exchange,
        `tradingview_${signal.strategy}`,
      ])
      
      // 记录止损订单
      if (stopLossOrder) {
        await query(`
          INSERT INTO trade_history (
            symbol,
            side,
            quantity,
            price,
            order_id,
            exchange,
            strategy,
            timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          signal.symbol,
          signal.action === 'BUY' ? 'SELL' : 'BUY',
          stopLossOrder.executedQuantity || signal.quantity,
          stopLossOrder.averagePrice || signal.stopLoss || 0,
          stopLossOrder.orderId,
          signal.exchange,
          `tradingview_stop_loss`,
        ])
      }
      
      // 记录止盈订单
      if (takeProfitOrder) {
        await query(`
          INSERT INTO trade_history (
            symbol,
            side,
            quantity,
            price,
            order_id,
            exchange,
            strategy,
            timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          signal.symbol,
          signal.action === 'BUY' ? 'SELL' : 'BUY',
          takeProfitOrder.executedQuantity || signal.quantity,
          takeProfitOrder.averagePrice || signal.takeProfit || 0,
          takeProfitOrder.orderId,
          signal.exchange,
          `tradingview_take_profit`,
        ])
      }
      
      console.log('✅ 交易记录已保存')
    } catch (error) {
      console.error('❌ 保存交易记录失败:', error)
    }
  }
} 