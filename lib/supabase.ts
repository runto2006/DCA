import { createClient } from '@supabase/supabase-js'

// 创建 Supabase 客户端的函数
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }
  
  return createClient(supabaseUrl, serviceRoleKey)
}

// 导出客户端（在运行时创建）
export const supabase = createSupabaseClient()
export const supabaseAdmin = createSupabaseAdminClient()

// 导出获取客户端的函数
export function getSupabase() {
  return supabase || createSupabaseClient()
}

export function getSupabaseAdmin() {
  return supabaseAdmin || createSupabaseAdminClient()
} 