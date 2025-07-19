const BASE_URL = 'http://localhost:3000'

async function createTestPosition() {
  console.log('🚀 创建测试持仓...\n')

  try {
    // 获取当前价格
    console.log('💰 获取当前价格...')
    const priceResponse = await fetch(`${BASE_URL}/api/price`)
    const priceData = await priceResponse.json()
    
    if (!priceResponse.ok) {
      console.error('❌ 获取当前价格失败:', priceData)
      return
    }
    
    console.log('✅ 获取当前价格成功')
    console.log(`📈 当前价格: $${priceData.price}`)

    // 创建测试持仓
    console.log('\n📝 创建测试持仓...')
    const testPosition = {
      symbol: 'SOL',
      position_type: 'LONG',
      entry_price: priceData.price,
      quantity: 1.0,
      stop_loss: priceData.price * 0.95, // 5%止损
      take_profit: priceData.price * 1.10, // 10%止盈
      strategy_reason: '移动止盈功能测试',
      notes: '用于测试移动止盈功能的测试持仓'
    }

    const createResponse = await fetch(`${BASE_URL}/api/positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPosition)
    })

    const createData = await createResponse.json()

    if (createResponse.ok) {
      console.log('✅ 创建测试持仓成功')
      console.log(`📊 持仓ID: ${createData.id}`)
      console.log(`📊 入场价格: $${createData.entry_price}`)
      console.log(`📊 数量: ${createData.quantity}`)
      console.log(`📊 止损价格: $${testPosition.stop_loss}`)
      console.log(`📊 止盈价格: $${testPosition.take_profit}`)
      
      console.log('\n🎉 测试持仓创建完成!')
      console.log('现在可以运行 test-trailing-stop.js 来测试移动止盈功能')
    } else {
      console.error('❌ 创建测试持仓失败:', createData)
    }

  } catch (error) {
    console.error('❌ 创建测试持仓过程中发生错误:', error)
  }
}

// 运行创建测试持仓
createTestPosition() 