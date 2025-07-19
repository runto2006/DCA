// 快速测试脚本
const axios = require('axios')

async function quickTest() {
  try {
    console.log('🚀 快速测试开始...')
    
    // 测试GET
    console.log('1. 测试GET /api/positions')
    const getResult = await axios.get('http://localhost:3001/api/positions')
    console.log('✅ GET成功:', getResult.status)
    
    // 测试POST
    console.log('2. 测试POST /api/positions')
    const postData = {
      symbol: 'SOL',
      position_type: 'LONG',
      entry_price: 173.22,
      quantity: 1.5
    }
    
    const postResult = await axios.post('http://localhost:3001/api/positions', postData)
    console.log('✅ POST成功:', postResult.status, postResult.data.id)
    
    console.log('🎉 所有测试通过！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.status, error.response?.data || error.message)
  }
}

quickTest() 