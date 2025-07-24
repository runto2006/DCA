import { query, transaction } from './database'

// 统一的数据库接口
export class DatabaseInterface {
  // 数据库表操作方法
  from(tableName: string) {
    return new TableInterface(tableName)
  }
}

// 表接口
class TableInterface {
  private tableName: string
  private selectFields: string[] = ['*']
  private whereConditions: { field: string; operator: string; value: any }[] = []
  private orderBy: { field: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private insertData: any = null
  private updateData: any = null
  private deleteFlag: boolean = false
  private upsertData: any = null
  private upsertConflictField: string | null = null
  private singleFlag: boolean = false

  constructor(tableName: string) {
    this.tableName = tableName
  }

  // 选择字段
  select(fields: string = '*') {
    this.selectFields = fields === '*' ? ['*'] : fields.split(',').map(f => f.trim())
    return this
  }

  // 条件查询
  eq(field: string, value: any) {
    this.whereConditions.push({ field, operator: '=', value })
    return this
  }

  neq(field: string, value: any) {
    this.whereConditions.push({ field, operator: '!=', value })
    return this
  }

  gt(field: string, value: any) {
    this.whereConditions.push({ field, operator: '>', value })
    return this
  }

  gte(field: string, value: any) {
    this.whereConditions.push({ field, operator: '>=', value })
    return this
  }

  lt(field: string, value: any) {
    this.whereConditions.push({ field, operator: '<', value })
    return this
  }

  lte(field: string, value: any) {
    this.whereConditions.push({ field, operator: '<=', value })
    return this
  }

  in(field: string, values: any[]) {
    this.whereConditions.push({ field, operator: 'IN', value: values })
    return this
  }

  like(field: string, value: string) {
    this.whereConditions.push({ field, operator: 'LIKE', value })
    return this
  }

  // 排序 - 修复方法名
  order(field: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { field, ascending: options.ascending !== false }
    return this
  }

  // 限制数量
  limit(count: number) {
    this.limitCount = count
    return this
  }

  // 插入数据
  insert(data: any) {
    this.insertData = data
    return this
  }

  // 更新数据
  update(data: any) {
    this.updateData = data
    return this
  }

  // 删除
  delete() {
    this.deleteFlag = true
    return this
  }

  // Upsert 操作
  upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.upsertData = data
    this.upsertConflictField = options?.onConflict || null
    return this
  }

  // 单条记录
  single() {
    this.singleFlag = true
    this.limitCount = 1
    return this
  }

  // 执行查询 - 修复方法调用
  async execute() {
    try {
      if (this.upsertData) {
        return await this.executeUpsert()
      } else if (this.insertData) {
        return await this.executeInsert()
      } else if (this.updateData) {
        return await this.executeUpdate()
      } else if (this.deleteFlag) {
        return await this.executeDelete()
      } else {
        return await this.executeSelect()
      }
    } catch (error) {
      console.error('数据库操作失败:', error)
      return { data: null, error }
    }
  }

  // 执行选择查询
  private async executeSelect() {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`
    const params: any[] = []
    let paramIndex = 1

    // 添加 WHERE 条件
    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map(condition => {
        if (condition.operator === 'IN') {
          const placeholders = condition.value.map(() => `$${paramIndex++}`).join(', ')
          params.push(...condition.value)
          return `${condition.field} IN (${placeholders})`
        } else {
          params.push(condition.value)
          return `${condition.field} ${condition.operator} $${paramIndex++}`
        }
      })
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // 添加排序
    if (this.orderBy) {
      sql += ` ORDER BY ${this.orderBy.field} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`
    }

    // 添加限制
    if (this.limitCount) {
      sql += ` LIMIT ${this.limitCount}`
    }

    const result = await query(sql, params)
    
    // 如果是 single() 调用，返回第一条记录
    if (this.singleFlag) {
      return { data: result.rows[0] || null, error: null }
    }
    
    return { data: result.rows, error: null }
  }

  // 执行插入
  private async executeInsert() {
    const fields = Object.keys(this.insertData)
    const values = Object.values(this.insertData)
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
    
    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
    const result = await query(sql, values)
    
    return { data: result.rows[0], error: null }
  }

  // 执行更新
  private async executeUpdate() {
    const fields = Object.keys(this.updateData)
    const values = Object.values(this.updateData)
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ')
    
    let sql = `UPDATE ${this.tableName} SET ${setClause}`
    const params = [...values]
    let paramIndex = values.length + 1

    // 添加 WHERE 条件
    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map(condition => {
        if (condition.operator === 'IN') {
          const placeholders = condition.value.map(() => `$${paramIndex++}`).join(', ')
          params.push(...condition.value)
          return `${condition.field} IN (${placeholders})`
        } else {
          params.push(condition.value)
          return `${condition.field} ${condition.operator} $${paramIndex++}`
        }
      })
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    sql += ' RETURNING *'
    const result = await query(sql, params)
    
    return { data: result.rows[0], error: null }
  }

  // 执行删除
  private async executeDelete() {
    let sql = `DELETE FROM ${this.tableName}`
    const params: any[] = []
    let paramIndex = 1

    // 添加 WHERE 条件
    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map(condition => {
        if (condition.operator === 'IN') {
          const placeholders = condition.value.map(() => `$${paramIndex++}`).join(', ')
          params.push(...condition.value)
          return `${condition.field} IN (${placeholders})`
        } else {
          params.push(condition.value)
          return `${condition.field} ${condition.operator} $${paramIndex++}`
        }
      })
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    const result = await query(sql, params)
    return { data: result.rows[0], error: null }
  }

  // 执行 Upsert
  private async executeUpsert() {
    const fields = Object.keys(this.upsertData)
    const values = Object.values(this.upsertData)
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
    
    let sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`
    
    // 添加 ON CONFLICT 子句
    if (this.upsertConflictField) {
      const updateFields = fields.filter(field => field !== this.upsertConflictField)
      const updateClause = updateFields.map((field, index) => `${field} = EXCLUDED.${field}`).join(', ')
      sql += ` ON CONFLICT (${this.upsertConflictField}) DO UPDATE SET ${updateClause}`
    }
    
    sql += ' RETURNING *'
    const result = await query(sql, values)
    
    return { data: result.rows[0], error: null }
  }
}

// 创建数据库接口实例
export const db = new DatabaseInterface()

// 数据库接口函数
export function getSupabase() {
  return db
}

export function getSupabaseAdmin() {
  return db
} 