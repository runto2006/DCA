// API 测试脚本
const baseUrl = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 开始测试 SOLBTC DCA 系统 API...\n');

  // 测试价格 API
  try {
    console.log('📊 测试价格 API...');
    const priceResponse = await fetch(`${baseUrl}/api/price`);
    const priceData = await priceResponse.json();
    
    if (priceData.error) {
      console.log('❌ 价格 API 错误:', priceData.error);
    } else {
      console.log('✅ 价格 API 成功:');
      console.log(`   SOL/USDT: $${priceData.price}`);
      console.log(`   SOL/BTC: ${priceData.price_btc}`);
      console.log(`   24h 成交量: $${priceData.volume_24h?.toLocaleString()}`);
      console.log(`   市值: $${priceData.market_cap?.toLocaleString()}`);
      console.log(`   时间: ${new Date(priceData.timestamp).toLocaleString()}`);
      if (priceData.isMock) console.log('   📝 使用模拟数据');
    }
  } catch (error) {
    console.log('❌ 价格 API 请求失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 测试策略 API
  try {
    console.log('📈 测试策略 API...');
    const strategyResponse = await fetch(`${baseUrl}/api/strategy`);
    const strategyData = await strategyResponse.json();
    
    if (strategyData.error) {
      console.log('❌ 策略 API 错误:', strategyData.error);
    } else {
      console.log('✅ 策略 API 成功:');
      console.log(`   综合评分: ${strategyData.totalScore}/100`);
      console.log(`   建议操作: ${strategyData.recommendation}`);
      console.log(`   EMA89 评分: ${strategyData.emaScore}`);
      console.log(`   OBV 评分: ${strategyData.obvScore}`);
      console.log(`   RSI 评分: ${strategyData.rsiScore}`);
      console.log(`   MACD 评分: ${strategyData.macdScore}`);
      console.log(`   当前价格: $${strategyData.current_price}`);
      console.log(`   时间: ${new Date(strategyData.timestamp).toLocaleString()}`);
      if (strategyData.isMock) console.log('   📝 使用模拟数据');
    }
  } catch (error) {
    console.log('❌ 策略 API 请求失败:', error.message);
  }

  console.log('\n🎉 API 测试完成！');
}

// 运行测试
testAPI().catch(console.error); 