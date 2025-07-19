const { createClient } = require('@supabase/supabase-js')

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置')
  console.log('请确保设置了以下环境变量:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addTrailingStopFields() {
  console.log('🚀 开始添加移动止盈字段...\n')

  try {
    // 检查字段是否已存在
    console.log('📋 检查现有字段...')
    const { data: columns, error: columnsError } = await supabase
      .from('user_positions')
      .select('*')
      .limit(1)

    if (columnsError) {
      console.error('❌ 检查字段失败:', columnsError)
      return
    }

    console.log('✅ 字段检查完成')

    // 尝试添加移动止盈字段
    console.log('\n📝 添加移动止盈字段...')
    
    // 由于Supabase的限制，我们需要通过RPC调用或直接SQL来添加字段
    // 这里我们尝试使用RPC调用
    const { data: addFieldsResult, error: addFieldsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE user_positions 
          ADD COLUMN IF NOT EXISTS trailing_stop_enabled BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS trailing_stop_distance DECIMAL(10, 4),
          ADD COLUMN IF NOT EXISTS trailing_stop_price DECIMAL(20, 8),
          ADD COLUMN IF NOT EXISTS highest_price DECIMAL(20, 8),
          ADD COLUMN IF NOT EXISTS lowest_price DECIMAL(20, 8);
        `
      })

    if (addFieldsError) {
      console.log('⚠️  RPC调用失败，尝试其他方法...')
      
      // 尝试直接插入一条测试数据来触发字段创建
      console.log('📝 尝试通过插入测试数据来创建字段...')
      
      const { data: testInsert, error: testInsertError } = await supabase
        .from('user_positions')
        .insert({
          symbol: 'TEST',
          position_type: 'LONG',
          entry_price: 100,
          quantity: 1,
          total_amount: 100,
          trailing_stop_enabled: false,
          trailing_stop_distance: 5.0,
          trailing_stop_price: 95.0,
          highest_price: 100,
          lowest_price: 100,
          status: 'ACTIVE',
          user_id: 'test_user'
        })
        .select()

      if (testInsertError) {
        console.error('❌ 测试插入失败:', testInsertError)
        console.log('\n💡 建议手动在Supabase控制台中执行以下SQL:')
        console.log(`
          ALTER TABLE user_positions 
          ADD COLUMN IF NOT EXISTS trailing_stop_enabled BOOLEAN DEFAULT FALSE;
          
          ALTER TABLE user_positions 
          ADD COLUMN IF NOT EXISTS trailing_stop_distance DECIMAL(10, 4);
          
          ALTER TABLE user_positions 
          ADD COLUMN IF NOT EXISTS trailing_stop_price DECIMAL(20, 8);
          
          ALTER TABLE user_positions 
          ADD COLUMN IF NOT EXISTS highest_price DECIMAL(20, 8);
          
          ALTER TABLE user_positions 
          ADD COLUMN IF NOT EXISTS lowest_price DECIMAL(20, 8);
        `)
        return
      } else {
        console.log('✅ 测试插入成功，字段可能已创建')
        
        // 删除测试数据
        if (testInsert && testInsert.length > 0) {
          await supabase
            .from('user_positions')
            .delete()
            .eq('symbol', 'TEST')
            .eq('user_id', 'test_user')
        }
      }
    } else {
      console.log('✅ 字段添加成功')
    }

    // 验证字段是否已添加
    console.log('\n🔍 验证字段添加结果...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_positions')
      .select('*')
      .limit(1)

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError)
      return
    }

    if (verifyData && verifyData.length > 0) {
      const fields = Object.keys(verifyData[0])
      console.log('📊 当前字段列表:')
      fields.forEach(field => {
        console.log(`   - ${field}`)
      })

      const trailingStopFields = [
        'trailing_stop_enabled',
        'trailing_stop_distance', 
        'trailing_stop_price',
        'highest_price',
        'lowest_price'
      ]

      const missingFields = trailingStopFields.filter(field => !fields.includes(field))
      
      if (missingFields.length === 0) {
        console.log('\n🎉 所有移动止盈字段已成功添加!')
      } else {
        console.log('\n⚠️  以下字段可能未添加:')
        missingFields.forEach(field => console.log(`   - ${field}`))
        console.log('\n💡 请手动在Supabase控制台中添加这些字段')
      }
    }

  } catch (error) {
    console.error('❌ 添加字段过程中发生错误:', error)
  }
}

// 运行添加字段
addTrailingStopFields() 