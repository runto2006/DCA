import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// 多币种系统核心API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const symbol = searchParams.get('symbol')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 })
    }

    switch (action) {
      case 'list':
        // 获取所有活跃币种列表
        const { data: currencies, error: listError } = await supabaseAdmin
          .from('currency_config')
          .select('*')
          .eq('is_active', true)
          .order('symbol')

        if (listError) {
          throw new Error(`获取币种列表失败: ${listError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: currencies,
          count: currencies.length
        })

      case 'prices':
        // 获取币种价格数据
        const { data: prices, error: pricesError } = await supabaseAdmin
          .from('latest_currency_prices')
          .select('*')
          .limit(limit)

        if (pricesError) {
          throw new Error(`获取价格数据失败: ${pricesError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: prices,
          count: prices.length
        })

      case 'indicators':
        // 获取技术指标数据
        if (!symbol) {
          return NextResponse.json({ error: '缺少币种参数' }, { status: 400 })
        }

        const { data: indicators, error: indicatorsError } = await supabaseAdmin
          .from('latest_currency_indicators')
          .select('*')
          .eq('symbol', symbol)
          .single()

        if (indicatorsError) {
          throw new Error(`获取技术指标失败: ${indicatorsError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: indicators
        })

      case 'scores':
        // 获取策略评分数据
        const { data: scores, error: scoresError } = await supabaseAdmin
          .from('latest_currency_scores')
          .select('*')
          .limit(limit)

        if (scoresError) {
          throw new Error(`获取策略评分失败: ${scoresError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: scores,
          count: scores.length
        })

      case 'recommendations':
        // 获取币种推荐列表
        const { data: recommendations, error: recError } = await supabaseAdmin
          .rpc('get_currency_recommendations', { limit_count: limit })

        if (recError) {
          throw new Error(`获取推荐列表失败: ${recError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: recommendations,
          count: recommendations.length
        })

      case 'portfolio':
        // 获取用户组合数据
        const userId = searchParams.get('user_id') || 'default_user'
        const { data: portfolio, error: portfolioError } = await supabaseAdmin
          .rpc('calculate_portfolio_value', { user_id_param: userId })

        if (portfolioError) {
          throw new Error(`获取组合数据失败: ${portfolioError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: portfolio,
          count: portfolio.length
        })

      case 'dca-settings':
        // 获取DCA设置
        const { data: dcaSettings, error: dcaError } = await supabaseAdmin
          .from('multi_currency_dca_settings')
          .select('*')
          .limit(limit)

        if (dcaError) {
          throw new Error(`获取DCA设置失败: ${dcaError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: dcaSettings,
          count: dcaSettings.length
        })

      default:
        return NextResponse.json({ error: '无效的操作类型' }, { status: 400 })
    }

  } catch (error) {
    console.error('多币种API错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

// 创建或更新币种配置
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 })
    }

    switch (action) {
      case 'add_currency':
        // 添加新币种
        const { data: newCurrency, error: addError } = await supabaseAdmin
          .from('currency_config')
          .insert(data)
          .select()
          .single()

        if (addError) {
          throw new Error(`添加币种失败: ${addError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: newCurrency,
          message: '币种添加成功'
        })

      case 'update_currency':
        // 更新币种配置
        const { data: updatedCurrency, error: updateError } = await supabaseAdmin
          .from('currency_config')
          .update(data)
          .eq('symbol', data.symbol)
          .select()
          .single()

        if (updateError) {
          throw new Error(`更新币种失败: ${updateError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: updatedCurrency,
          message: '币种更新成功'
        })

      case 'add_dca_setting':
        // 添加DCA设置
        const { data: dcaSetting, error: dcaError } = await supabaseAdmin
          .from('multi_currency_dca_settings')
          .insert(data)
          .select()
          .single()

        if (dcaError) {
          throw new Error(`添加DCA设置失败: ${dcaError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: dcaSetting,
          message: 'DCA设置添加成功'
        })

      case 'add_portfolio':
        // 添加组合配置
        const { data: portfolio, error: portfolioError } = await supabaseAdmin
          .from('currency_portfolio_config')
          .insert(data)
          .select()
          .single()

        if (portfolioError) {
          throw new Error(`添加组合配置失败: ${portfolioError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: portfolio,
          message: '组合配置添加成功'
        })

      default:
        return NextResponse.json({ error: '无效的操作类型' }, { status: 400 })
    }

  } catch (error) {
    console.error('多币种API错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

// 删除币种配置
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const action = searchParams.get('action') || 'disable'

    if (!symbol) {
      return NextResponse.json({ error: '缺少币种参数' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 })
    }

    if (action === 'disable') {
      // 禁用币种（软删除）
      const { error: disableError } = await supabaseAdmin
        .from('currency_config')
        .update({ is_active: false })
        .eq('symbol', symbol)

      if (disableError) {
        throw new Error(`禁用币种失败: ${disableError.message}`)
      }

      return NextResponse.json({
        success: true,
        message: `币种 ${symbol} 已禁用`
      })
    } else if (action === 'delete') {
      // 硬删除币种（谨慎使用）
      const { error: deleteError } = await supabaseAdmin
        .from('currency_config')
        .delete()
        .eq('symbol', symbol)

      if (deleteError) {
        throw new Error(`删除币种失败: ${deleteError.message}`)
      }

      return NextResponse.json({
        success: true,
        message: `币种 ${symbol} 已删除`
      })
    }

    return NextResponse.json({ error: '无效的操作类型' }, { status: 400 })

  } catch (error) {
    console.error('多币种API错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
} 