# 🎨 现代化前端UI组件库使用指南

## 📋 概述

本项目已升级为现代化的前端UI组件库，采用最新的设计理念和技术栈，提供更好的用户体验和开发效率。

## 🚀 主要特性

### ✨ 现代化设计
- **玻璃态效果**: 半透明背景和模糊效果
- **渐变色彩**: 丰富的渐变色彩方案
- **微交互动画**: 平滑的悬停和点击效果
- **响应式布局**: 完美适配各种屏幕尺寸

### 🛠️ 技术栈
- **Next.js 14**: 最新的React框架
- **TypeScript**: 类型安全的JavaScript
- **Tailwind CSS**: 原子化CSS框架
- **Lucide React**: 现代化图标库

## 📦 组件库

### 🎯 布局组件

#### Layout 布局容器
```tsx
import { Layout, Container, Section, Grid } from '@/components/ui'

<Layout>
  <Container>
    <Section title="页面标题" subtitle="页面描述">
      <Grid cols={2}>
        {/* 内容 */}
      </Grid>
    </Section>
  </Container>
</Layout>
```

#### Navigation 导航栏
```tsx
import { Navigation } from '@/components/ui'

<Navigation 
  title="SOLBTC DCA 系统" 
  subtitle="智能交易策略管理"
/>
```

### 🎨 基础组件

#### Button 按钮
```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md" loading={false}>
  点击按钮
</Button>

// 变体: primary, secondary, success, warning, danger, ghost
// 尺寸: sm, md, lg
```

#### Card 卡片
```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui'

<Card hover interactive>
  <CardHeader>
    <h3>卡片标题</h3>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
  <CardFooter>
    卡片底部
  </CardFooter>
</Card>
```

#### Input 输入框
```tsx
import { Input, Textarea } from '@/components/ui'

<Input 
  label="用户名"
  placeholder="请输入用户名"
  error="用户名不能为空"
  helperText="用户名长度为3-20个字符"
/>

<Textarea 
  label="描述"
  placeholder="请输入描述"
/>
```

#### Table 表格
```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui'

<Table>
  <TableHeader>
    <TableRow>
      <TableHeaderCell>姓名</TableHeaderCell>
      <TableHeaderCell>年龄</TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>张三</TableCell>
      <TableCell>25</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 📊 状态组件

#### LoadingSpinner 加载指示器
```tsx
import { LoadingSpinner, LoadingCard } from '@/components/ui'

<LoadingSpinner size="lg" text="加载中..." />

<LoadingCard text="数据加载中..." />
```

#### StatusIndicator 状态指示器
```tsx
import { StatusIndicator, MetricCard } from '@/components/ui'

<StatusIndicator status="success" text="操作成功" />
<StatusIndicator status="warning" text="警告信息" />
<StatusIndicator status="error" text="错误信息" />
<StatusIndicator status="info" text="提示信息" />

<MetricCard 
  label="总资产" 
  value="$1,234,567" 
  trend="up"
/>
```

## 🎨 样式类

### 卡片样式
- `.card`: 基础卡片样式
- `.card-hover`: 悬停效果
- `.card-interactive`: 交互效果

### 按钮样式
- `.btn-primary`: 主要按钮
- `.btn-secondary`: 次要按钮
- `.btn-success`: 成功按钮
- `.btn-warning`: 警告按钮
- `.btn-danger`: 危险按钮
- `.btn-ghost`: 幽灵按钮

### 状态样式
- `.status-indicator`: 状态指示器基础样式
- `.status-success`: 成功状态
- `.status-warning`: 警告状态
- `.status-error`: 错误状态
- `.status-info`: 信息状态

### 数据展示样式
- `.metric-card`: 数据卡片
- `.metric-value`: 数据值
- `.metric-label`: 数据标签

### 表单样式
- `.form-group`: 表单组
- `.form-label`: 表单标签
- `.form-input`: 表单输入框
- `.form-textarea`: 表单文本域

### 表格样式
- `.table-modern`: 现代化表格

## 🔧 工具函数

### 格式化函数
```tsx
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'

formatCurrency(1234.56) // "$1,234.56"
formatNumber(1234567) // "1.23M"
formatPercentage(12.34) // "12.34%"
```

### 颜色函数
```tsx
import { getPriceChangeColor } from '@/lib/utils'

getPriceChangeColor(5.2) // "text-green-600 dark:text-green-400"
getPriceChangeColor(-3.1) // "text-red-600 dark:text-red-400"
```

### 工具函数
```tsx
import { debounce, throttle, storage } from '@/lib/utils'

// 防抖
const debouncedSearch = debounce(searchFunction, 300)

// 节流
const throttledScroll = throttle(scrollFunction, 100)

// 本地存储
storage.set('user', { name: 'John' })
const user = storage.get('user')
storage.remove('user')
```

## 📱 响应式设计

### 断点系统
- `sm`: 640px 及以上
- `md`: 768px 及以上
- `lg`: 1024px 及以上
- `xl`: 1280px 及以上
- `2xl`: 1536px 及以上

### 网格系统
```tsx
// 1列 (移动端)
<Grid cols={1}>

// 2列 (平板及以上)
<Grid cols={2}>

// 3列 (桌面端及以上)
<Grid cols={3}>

// 4列 (大屏及以上)
<Grid cols={4}>
```

## 🎯 最佳实践

### 1. 组件组合
```tsx
// 推荐：使用组合模式
<Card>
  <CardHeader>
    <h3>标题</h3>
  </CardHeader>
  <CardContent>
    <p>内容</p>
  </CardContent>
</Card>

// 不推荐：直接使用div
<div className="card">
  <div className="mb-4">
    <h3>标题</h3>
  </div>
  <div>
    <p>内容</p>
  </div>
</div>
```

### 2. 状态管理
```tsx
// 推荐：使用状态组件
<StatusIndicator status="success" text="操作成功" />

// 不推荐：手动样式
<span className="status-indicator status-success">操作成功</span>
```

### 3. 响应式设计
```tsx
// 推荐：使用Grid组件
<Grid cols={2}>
  <Card>内容1</Card>
  <Card>内容2</Card>
</Grid>

// 不推荐：手动响应式
<div className="grid grid-cols-1 md:grid-cols-2">
  <div className="card">内容1</div>
  <div className="card">内容2</div>
</div>
```

## 🔄 迁移指南

### 从旧版本迁移

1. **替换基础组件**
   ```tsx
   // 旧版本
   <div className="card">内容</div>
   
   // 新版本
   <Card>内容</Card>
   ```

2. **使用新的按钮组件**
   ```tsx
   // 旧版本
   <button className="btn-primary">按钮</button>
   
   // 新版本
   <Button variant="primary">按钮</Button>
   ```

3. **使用工具函数**
   ```tsx
   // 旧版本
   const formatPrice = (price) => `$${price.toFixed(2)}`
   
   // 新版本
   import { formatCurrency } from '@/lib/utils'
   formatCurrency(price)
   ```

## 📚 更多资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Lucide React 图标](https://lucide.dev/icons)
- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs)

---

🎉 **享受现代化的开发体验！** 