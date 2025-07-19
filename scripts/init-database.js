const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'solbtc_dca',
  user: process.env.DB_USER || 'solbtc_user',
  password: process.env.DB_PASSWORD || 'runto2015',
}

async function initDatabase() {
  console.log('🚀 开始初始化本地数据库...')
  
  const pool = new Pool(dbConfig)
  
  try {
    // 测试连接
    console.log('🔍 测试数据库连接...')
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    console.log('✅ 数据库连接成功:', result.rows[0])
    client.release()
    
    // 读取SQL文件
    console.log('📖 读取数据库结构文件...')
    const sqlPath = path.join(__dirname, '..', 'supabase.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // 分割SQL语句
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 找到 ${sqlStatements.length} 条SQL语句`)
    
    // 执行SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i]
      if (sql.trim()) {
        try {
          console.log(`📝 执行SQL语句 ${i + 1}/${sqlStatements.length}...`)
          await pool.query(sql)
          console.log(`✅ SQL语句 ${i + 1} 执行成功`)
        } catch (error) {
          console.error(`❌ SQL语句 ${i + 1} 执行失败:`, error.message)
          // 继续执行其他语句
        }
      }
    }
    
    // 验证表结构
    console.log('🔍 验证数据库表结构...')
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('📋 已创建的表:')
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // 插入初始数据
    console.log('📝 插入初始数据...')
    await insertInitialData(pool)
    
    console.log('🎉 数据库初始化完成！')
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  } finally {
    await pool.end()
  }
}

async function insertInitialData(pool) {
  // 插入多币种配置
  const currencies = [
    { symbol: 'SOL', name: 'Solana', enabled: true, priority: 1 },
    { symbol: 'BTC', name: 'Bitcoin', enabled: true, priority: 2 },
    { symbol: 'ETH', name: 'Ethereum', enabled: true, priority: 3 },
    { symbol: 'ADA', name: 'Cardano', enabled: true, priority: 4 },
    { symbol: 'DOT', name: 'Polkadot', enabled: true, priority: 5 },
    { symbol: 'LINK', name: 'Chainlink', enabled: true, priority: 6 },
    { symbol: 'MATIC', name: 'Polygon', enabled: true, priority: 7 },
    { symbol: 'AVAX', name: 'Avalanche', enabled: true, priority: 8 },
    { symbol: 'UNI', name: 'Uniswap', enabled: true, priority: 9 },
    { symbol: 'ATOM', name: 'Cosmos', enabled: true, priority: 10 }
  ]
  
  for (const currency of currencies) {
    try {
      await pool.query(`
        INSERT INTO multi_currency_config (symbol, name, enabled, priority, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          enabled = EXCLUDED.enabled,
          priority = EXCLUDED.priority,
          updated_at = NOW()
      `, [currency.symbol, currency.name, currency.enabled, currency.priority])
      console.log(`✅ 插入币种配置: ${currency.symbol}`)
    } catch (error) {
      console.error(`❌ 插入币种配置失败 ${currency.symbol}:`, error.message)
    }
  }
  
  // 插入默认DCA设置
  try {
    await pool.query(`
      INSERT INTO multi_currency_dca_settings (
        currency_symbol, base_amount, max_orders, price_deviation, 
        take_profit, amount_multiplier, deviation_multiplier, enabled, created_at, updated_at
      )
      VALUES 
        ('SOL', 50, 5, 2.0, 1.5, 1.2, 1.1, false, NOW(), NOW()),
        ('BTC', 100, 3, 1.5, 1.2, 1.5, 1.2, false, NOW(), NOW()),
        ('ETH', 80, 4, 1.8, 1.3, 1.3, 1.1, false, NOW(), NOW())
      ON CONFLICT (currency_symbol) DO NOTHING
    `)
    console.log('✅ 插入默认DCA设置')
  } catch (error) {
    console.error('❌ 插入DCA设置失败:', error.message)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ 数据库初始化脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 数据库初始化脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { initDatabase } 