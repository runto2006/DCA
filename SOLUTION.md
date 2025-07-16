# SOLBTC DCA 系统客户端异常解决方案

## 🔍 问题诊断

你遇到的 "Application error: a client-side exception has occurred" 错误主要由以下原因造成：

1. **缺少环境变量配置** - Supabase 连接信息未配置
2. **API 路由错误** - 后端 API 返回错误导致前端崩溃
3. **依赖包缺失** - 某些 npm 包未正确安装

## 🛠️ 解决步骤

### 第一步：安装依赖包

```bash
npm install
```

### 第二步：配置环境变量

1. 复制环境变量示例文件：
```bash
cp env.example .env.local
```

2. 编辑 `.env.local` 文件，填入你的 Supabase 配置：
```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的_supabase_服务角色密钥
```

### 第三步：初始化数据库

1. 登录 Supabase 控制台
2. 在 SQL 编辑器中执行 `supabase.sql` 文件中的所有 SQL 语句

### 第四步：重新启动开发服务器

```bash
npm run dev
```

## 🔧 临时解决方案

如果暂时无法配置 Supabase，系统已经修改为：

1. **API 错误处理** - 当 Supabase 未配置时返回模拟数据
2. **前端错误处理** - 显示友好的错误提示而不是崩溃
3. **降级模式** - 即使没有数据库也能显示基本界面

## 📋 检查清单

- [ ] 运行 `npm install` 安装所有依赖
- [ ] 创建并配置 `.env.local` 文件
- [ ] 在 Supabase 中执行数据库初始化脚本
- [ ] 重启开发服务器
- [ ] 检查浏览器控制台是否还有错误

## 🚨 常见问题

### Q: 仍然出现客户端异常
A: 检查浏览器控制台的具体错误信息，可能是：
- 网络连接问题
- API 端点不存在
- 环境变量格式错误

### Q: Supabase 连接失败
A: 确认：
- 项目 URL 和密钥是否正确
- 网络连接是否正常
- Supabase 项目是否已创建

### Q: 依赖包安装失败
A: 尝试：
- 清除 node_modules: `rm -rf node_modules package-lock.json`
- 重新安装: `npm install`
- 使用 yarn: `yarn install`

## 📞 获取帮助

如果问题仍然存在，请：
1. 检查浏览器控制台的详细错误信息
2. 确认 Supabase 项目配置
3. 查看网络请求是否成功

---

**注意**: 本系统设计为即使在没有完整配置的情况下也能正常运行，显示模拟数据。 