# SOLBTC DCA 轮动模型追踪系统

一个基于 Next.js + Supabase 的 SOL/USDT 不止损轮动模型实时追踪与策略评分系统。

## 🚀 功能特性

### 核心功能
- **实时价格监控**: 实时显示 SOL/USDT 和 SOL/BTC 价格
- **技术指标分析**: EMA89、OBV、RSI、MACD 四大指标实时计算
- **策略评分系统**: 基于多指标的综合评分和建议
- **持仓管理**: 支持手动创建和管理交易持仓
- **交易历史**: 完整的交易记录和统计
- **自动数据抓取**: 每日自动更新价格和技术指标数据

### 技术指标
- **EMA89**: 89周期指数移动平均线
- **OBV**: 能量潮指标
- **RSI**: 相对强弱指数
- **MACD**: 移动平均收敛散度

## 🛠️ 技术栈

- **前端**: Next.js 14, React 18, TypeScript
- **样式**: TailwindCSS
- **后端**: Supabase (PostgreSQL + Edge Functions)
- **部署**: Vercel
- **数据源**: CoinGecko API

## 📦 安装部署

### 1. 环境准备

确保你已经完成以下步骤：
- ✅ 登录 GitHub
- ✅ 登录 Vercel
- ✅ 登录 Supabase 控制台
- ✅ 创建 Supabase 项目

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd SOLBTC-dca-trading-system
```

### 3. 安装依赖

```bash
npm install
```

### 4. 环境配置

复制环境变量文件：
```bash
cp env.example .env.local
```

编辑 `.env.local` 文件，填入你的 Supabase 配置：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. 数据库初始化

在 Supabase 控制台的 SQL 编辑器中执行 `supabase.sql` 文件中的所有 SQL 语句。

### 6. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 7. 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

## 📊 数据库结构

### 主要数据表
- `price_data`: 价格数据
- `technical_indicators`: 技术指标数据
- `strategy_scores`: 策略评分数据
- `user_positions`: 用户持仓
- `trade_history`: 交易历史
- `system_config`: 系统配置

## 🔧 API 接口

### 价格数据
- `GET /api/price` - 获取实时价格

### 策略评分
- `GET /api/strategy` - 获取策略评分

### 持仓管理
- `GET /api/positions` - 获取持仓列表
- `POST /api/positions` - 创建新持仓
- `PUT /api/positions/[id]/close` - 平仓操作

### 交易历史
- `GET /api/trades` - 获取交易历史

### 定时任务
- `GET /api/cron/daily-data` - 每日数据抓取

## 🎯 使用指南

### 1. 查看实时数据
- 打开应用首页，查看 SOL 实时价格和策略评分
- 数据每30秒自动刷新

### 2. 管理持仓
- 点击"新建持仓"按钮创建新持仓
- 选择持仓类型（做多/做空）
- 输入入场价格和数量
- 点击"平仓"按钮关闭持仓

### 3. 查看交易历史
- 在交易历史面板查看所有交易记录
- 包含交易统计信息

### 4. 策略评分解读
- **总评分 70+**: 建议买入
- **总评分 30-**: 建议卖出
- **总评分 30-70**: 建议持有

## 🔄 自动数据更新

系统配置了每日自动数据抓取任务：
- 每天凌晨自动获取 SOL 价格数据
- 计算并更新技术指标
- 更新策略评分

## 🚨 注意事项

1. **风险提示**: 本系统仅供学习和研究使用，不构成投资建议
2. **数据延迟**: 价格数据可能有轻微延迟
3. **策略评分**: 评分仅供参考，实际交易请谨慎决策
4. **数据存储**: 所有数据存储在 Supabase 中，请妥善保管账户信息

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 📄 许可证

MIT License

## 📞 支持

如有问题，请通过 GitHub Issues 联系。 