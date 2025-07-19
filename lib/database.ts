import { Pool } from 'pg'

// 本地PostgreSQL数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'solbtc_dca',
  user: process.env.DB_USER || 'solbtc_user',
  password: process.env.DB_PASSWORD || 'runto2015',
  max: 20, // 连接池最大连接数
  idleTimeoutMillis: 30000, // 连接空闲超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
}

// 创建数据库连接池
const pool = new Pool(dbConfig)

// 测试数据库连接
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('✅ 数据库连接成功:', result.rows[0])
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    return false
  }
}

// 执行查询
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('📊 执行查询:', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('❌ 查询执行失败:', error)
    throw error
  }
}

// 执行事务
export async function transaction(callback: (client: any) => Promise<any>) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// 关闭连接池
export async function closePool() {
  await pool.end()
}

export default pool 