# SOLBTC-DCA加仓系统

一个基于 Next.js + 本地PostgreSQL数据库 的智能DCA（定投）交易系统，支持多币种、移动止盈和实时价格监控。

## 🚀 功能特性

- 📊 **实时价格监控**: 支持多币种实时价格显示
- 💰 **DCA自动交易**: 智能定投策略，自动执行交易
- 📈 **多币种支持**: BTC、ETH、SOL等多种主流币种
- 🎯 **移动止盈**: 智能移动止盈功能，最大化收益
- 📱 **响应式界面**: 现代化UI设计，支持移动端
- 🔒 **安全集成**: 安全的Binance API集成

## 🛠️ 技术栈

- **前端**: Next.js 14, React 18, TypeScript
- **样式**: TailwindCSS
- **后端**: 本地PostgreSQL数据库
- **交易**: Binance API
- **部署**: Vercel

## 🚀 快速开始

### Windows用户

1. **一键启动** (推荐)
   ```bash
   # 双击运行 start.bat 文件
   # 或在命令行中执行：
   start.bat
   ```

2. **手动安装**
   - 安装 [Node.js](https://nodejs.org/) (18.0+)
   - 安装 [Git](https://git-scm.com/)
   - 克隆项目并安装依赖
   - 配置环境变量
   - 启动服务器

详细安装步骤请查看 [Windows安装教程.md](./Windows安装教程.md)

### 环境配置

1. 复制环境变量模板：
   ```bash
   copy env.example env.local
   ```

2. 编辑 `env.local` 文件：
   ```env
   # 本地PostgreSQL数据库配置
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=solbtc_dca
   DB_USER=solbtc_user
   DB_PASSWORD=runto2015

   # Binance API配置
   BINANCE_API_KEY=your_binance_api_key
   BINANCE_SECRET_KEY=your_binance_secret_key

   # 其他配置
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

### 启动应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

访问 http://localhost:3000 查看应用

## 📊 主要功能

### 1. 价格监控
- 实时显示多币种价格
- 价格变化趋势图表
- 24小时涨跌幅统计

### 2. DCA策略
- 智能定投策略配置
- 自动执行交易
- 策略效果分析

### 3. 持仓管理
- 创建和管理交易持仓
- 移动止盈设置
- 持仓盈亏统计

### 4. 交易历史
- 完整的交易记录
- 交易统计分析
- 收益曲线图表

## 🔧 项目结构

```
SOLBTC-DCA加仓/
├── app/                    # Next.js应用主目录
│   ├── api/               # API路由
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 布局组件
│   └── page.tsx           # 主页面
├── components/            # React组件
│   ├── ui/               # UI组件库
│   └── *.tsx             # 功能组件
├── lib/                   # 工具库
├── scripts/              # 脚本文件
├── start.bat             # Windows快速启动脚本
├── build-direct.bat      # 构建脚本
└── README.md             # 项目说明
```

## 🚨 重要提醒

1. **风险提示**: 本系统仅供学习和研究使用，不构成投资建议
2. **API安全**: 请妥善保管您的Binance API密钥
3. **资金安全**: 建议先使用小额资金测试
4. **数据备份**: 定期备份重要数据

## 📞 技术支持

如遇到问题，请检查：
1. Node.js版本是否符合要求
2. PostgreSQL是否正确安装和配置
3. 环境变量配置是否正确
4. 数据库连接是否正常
5. API密钥是否有效

## �� 许可证

MIT License 