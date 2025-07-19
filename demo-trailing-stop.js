const BASE_URL = 'http://localhost:3000'

async function demoTrailingStop() {
  console.log('🎬 移动止盈功能演示\n')
  console.log('=' * 50)
  
  try {
    // 1. 演示准备
    console.log('📋 1. 演示准备')
    console.log('   获取当前系统状态...')
    
    const positionsResponse = await fetch(`${BASE_URL}/api/positions`)
    const priceResponse = await fetch(`${BASE_URL}/api/price`)
    
    if (!positionsResponse.ok || !priceResponse.ok) {
      console.log('   ❌ 无法连接到系统，请确保服务器正在运行')
      return
    }
    
    const positionsData = await positionsResponse.json()
    const priceData = await priceResponse.json()
    
    const activePositions = positionsData.positions?.filter(p => p.status === 'ACTIVE') || []
    const currentPrice = priceData.price
    
    console.log(`   ✅ 系统连接正常`)
    console.log(`   📊 当前价格: $${currentPrice}`)
    console.log(`   📊 活跃持仓: ${activePositions.length}个`)
    
    if (activePositions.length === 0) {
      console.log('   ⚠️  没有活跃持仓，创建演示持仓...')
      
      // 创建演示持仓
      const demoPosition = {
        symbol: 'SOL',
        position_type: 'LONG',
        entry_price: currentPrice,
        quantity: 1.0,
        strategy_reason: '移动止盈功能演示',
        notes: '用于演示移动止盈功能的测试持仓'
      }
      
      const createResponse = await fetch(`${BASE_URL}/api/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoPosition)
      })
      
      if (createResponse.ok) {
        console.log('   ✅ 演示持仓创建成功')
        // 重新获取持仓列表
        const newPositionsResponse = await fetch(`${BASE_URL}/api/positions`)
        const newPositionsData = await newPositionsResponse.json()
        const newActivePositions = newPositionsData.positions?.filter(p => p.status === 'ACTIVE') || []
        if (newActivePositions.length > 0) {
          activePositions.push(newActivePositions[0])
        }
      } else {
        console.log('   ❌ 演示持仓创建失败')
        return
      }
    }
    
    const testPosition = activePositions[0]
    console.log(`   🎯 使用持仓ID: ${testPosition.id}`)
    console.log(`   📊 入场价格: $${testPosition.entry_price}`)
    console.log(`   📊 持仓类型: ${testPosition.position_type}`)
    
    console.log('\n' + '=' * 50)
    
    // 2. 演示场景1: 启用移动止盈
    console.log('🎯 演示场景1: 启用移动止盈')
    console.log('   设置5%移动止盈距离...')
    
    const enableResponse = await fetch(`${BASE_URL}/api/positions/${testPosition.id}/trailing-stop`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        distance: 5.0,
        currentPrice: currentPrice
      }),
    })
    
    if (enableResponse.ok) {
      const enableData = await enableResponse.json()
      console.log('   ✅ 移动止盈启用成功!')
      console.log(`   📊 初始移动止盈价格: $${enableData.trailingStopPrice}`)
      console.log(`   📊 保护距离: 5%`)
      console.log(`   📊 当前价格: $${currentPrice}`)
      
      // 计算保护金额
      const protectionAmount = currentPrice - enableData.trailingStopPrice
      const protectionPercentage = (protectionAmount / currentPrice) * 100
      console.log(`   💰 保护金额: $${protectionAmount.toFixed(2)} (${protectionPercentage.toFixed(1)}%)`)
    } else {
      console.log('   ❌ 移动止盈启用失败')
      return
    }
    
    console.log('\n' + '=' * 50)
    
    // 3. 演示场景2: 价格上涨时的动态调整
    console.log('📈 演示场景2: 价格上涨时的动态调整')
    console.log('   模拟价格上涨3%...')
    
    const higherPrice = currentPrice * 1.03
    console.log(`   📊 模拟新价格: $${higherPrice.toFixed(2)} (上涨3%)`)
    
    const updateResponse = await fetch(`${BASE_URL}/api/positions/${testPosition.id}/trailing-stop`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        distance: 5.0,
        currentPrice: higherPrice
      }),
    })
    
    if (updateResponse.ok) {
      const updateData = await updateResponse.json()
      console.log('   ✅ 价格更新成功!')
      console.log(`   📊 新移动止盈价格: $${updateData.trailingStopPrice}`)
      
      // 计算新的保护金额
      const newProtectionAmount = higherPrice - updateData.trailingStopPrice
      const newProtectionPercentage = (newProtectionAmount / higherPrice) * 100
      console.log(`   💰 新保护金额: $${newProtectionAmount.toFixed(2)} (${newProtectionPercentage.toFixed(1)}%)`)
      
      // 计算利润保护
      const profit = higherPrice - testPosition.entry_price
      const profitPercentage = (profit / testPosition.entry_price) * 100
      console.log(`   📈 当前利润: $${profit.toFixed(2)} (${profitPercentage.toFixed(1)}%)`)
      console.log(`   🛡️  利润保护: 移动止盈将保护${profitPercentage.toFixed(1)}%的利润`)
    }
    
    console.log('\n' + '=' * 50)
    
    // 4. 演示场景3: 价格回撤时的保护机制
    console.log('📉 演示场景3: 价格回撤时的保护机制')
    console.log('   模拟价格回撤到移动止盈价格...')
    
    // 获取当前移动止盈价格
    const statusResponse = await fetch(`${BASE_URL}/api/positions/${testPosition.id}/trailing-stop`)
    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      const trailingStopPrice = statusData.trailing_stop_price
      
      console.log(`   📊 当前移动止盈价格: $${trailingStopPrice}`)
      console.log(`   📊 模拟回撤价格: $${trailingStopPrice}`)
      console.log('   ⚠️  价格触及移动止盈价格，将触发自动平仓!')
      
      // 模拟触发平仓
      const triggerResponse = await fetch(`${BASE_URL}/api/cron/trailing-stop-check`)
      if (triggerResponse.ok) {
        const triggerData = await triggerResponse.json()
        console.log('   🔍 移动止盈检查结果:')
        console.log(`   📊 检查持仓数: ${triggerData.checkedPositions}`)
        console.log(`   📊 触发平仓数: ${triggerData.triggeredPositions}`)
        
        if (triggerData.triggeredPositions > 0) {
          console.log('   🎉 移动止盈成功触发平仓!')
          console.log('   💰 利润已锁定，风险已控制!')
        } else {
          console.log('   📊 当前价格未触发平仓条件')
        }
      }
    }
    
    console.log('\n' + '=' * 50)
    
    // 5. 演示场景4: 不同距离设置对比
    console.log('⚙️  演示场景4: 不同距离设置对比')
    console.log('   展示不同距离设置的效果...')
    
    const distances = [3, 5, 8, 10]
    console.log('   📊 距离设置对比:')
    
    for (const distance of distances) {
      const trailingStopPrice = currentPrice * (1 - distance / 100)
      const protectionAmount = currentPrice - trailingStopPrice
      const protectionPercentage = (protectionAmount / currentPrice) * 100
      
      console.log(`   ${distance}% 距离: 移动止盈价格 $${trailingStopPrice.toFixed(2)}, 保护 $${protectionAmount.toFixed(2)} (${protectionPercentage.toFixed(1)}%)`)
    }
    
    console.log('\n   💡 距离越小，保护越紧密但可能过早触发')
    console.log('   💡 距离越大，保护越宽松但可能损失更多利润')
    
    console.log('\n' + '=' * 50)
    
    // 6. 演示总结
    console.log('🎉 移动止盈功能演示完成!')
    console.log('\n📝 功能特点总结:')
    console.log('   ✅ 动态调整: 根据价格走势自动调整止盈价格')
    console.log('   ✅ 利润保护: 有效保护已获得的利润')
    console.log('   ✅ 风险控制: 自动触发平仓，减少人为情绪干扰')
    console.log('   ✅ 灵活配置: 支持不同距离设置，适应不同市场条件')
    console.log('   ✅ 双向支持: 支持做多和做空持仓')
    
    console.log('\n🚀 使用建议:')
    console.log('   📊 保守策略: 3-5% 距离，适合波动较小的市场')
    console.log('   📊 平衡策略: 5-8% 距离，适合一般市场条件')
    console.log('   📊 激进策略: 8-15% 距离，适合波动较大的市场')
    
    console.log('\n⚠️  风险提示:')
    console.log('   🔸 移动止盈不能保证盈利，但能有效控制风险')
    console.log('   🔸 在剧烈波动的市场中可能过早触发')
    console.log('   🔸 建议结合其他风险管理策略使用')
    
    console.log('\n🎯 移动止盈功能已准备就绪，可以投入生产使用!')
    
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error)
    console.log('\n💡 请确保:')
    console.log('   1. 开发服务器正在运行 (npm run dev)')
    console.log('   2. 数据库连接正常')
    console.log('   3. 网络连接稳定')
  }
}

// 运行演示
demoTrailingStop() 