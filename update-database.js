// 数据库更新脚本
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://bnhdkgyouipqliwfsepq.supabase.co'
const supabaseKey = 'sb_secret_JLvrG69HGM_XjaBBIqJjsw_pNoOJq0T'

async function updateDatabase() {
  try {
    console.log('🔄 开始更新数据库结构...')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 读取SQL文件
    const sqlContent = fs.readFileSync('update-database.sql', 'utf8')
    const statements = sqlContent.split(';').filter(stmt => stmt.trim())
    
    console.log(`📝 找到 ${statements.length} 条SQL语句`)
    
    // 逐条执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      console.log(`\n执行语句 ${i + 1}/${statements.length}:`)
      console.log(statement.substring(0, 100) + '...')
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.error(`❌ 语句 ${i + 1} 执行失败:`, error)
        } else {
          console.log(`✅ 语句 ${i + 1} 执行成功`)
        }
      } catch (err) {
        console.error(`❌ 语句 ${i + 1} 执行异常:`, err.message)
      }
    }
    
    console.log('\n🎉 数据库更新完成！')
    
    // 验证更新结果
    console.log('\n🔍 验证更新结果...')
    
    const { data: positions, error: posError } = await supabase
      .from('user_positions')
      .select('*')
      .limit(1)
    
    if (posError) {
      console.error('❌ 验证失败:', posError)
    } else {
      console.log('✅ 表结构验证成功')
      if (positions.length > 0) {
        console.log('📊 字段列表:', Object.keys(positions[0]))
      }
    }
    
  } catch (error) {
    console.error('💥 数据库更新失败:', error)
  }
}

// 运行更新
updateDatabase() 