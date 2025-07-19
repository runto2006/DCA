# 🐧 Ubuntu本地部署指南

## 📋 系统要求

- Ubuntu 20.04 LTS 或更高版本
- 至少 4GB RAM
- 至少 20GB 可用磁盘空间
- 网络连接（用于下载Docker镜像和Node.js包）

## 🚀 快速部署

### 1. 克隆项目
```bash
git clone <your-repository-url>
cd SOLBTC-DCA加仓
```

### 2. 运行自动设置脚本
```bash
chmod +x scripts/setup-ubuntu.sh
./scripts/setup-ubuntu.sh
```

### 3. 配置环境变量
```bash
cp env.local.example .env.local
nano .env.local
```

编辑 `.env.local` 文件，配置币安API密钥：
```env
# 币安API配置
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
```

### 4. 启动数据库
```bash
docker-compose up -d
```

### 5. 初始化数据库
```bash
node scripts/init-database.js
```

### 6. 启动应用
```bash
npm run dev
```

### 7. 访问应用
打开浏览器访问：http://localhost:3000

## 📊 数据库信息

### PostgreSQL配置
- **主机**: localhost
- **端口**: 5432
- **数据库名**: solbtc_dca
- **用户名**: solbtc_user
- **密码**: runto2015

### 连接测试
```bash
# 使用Docker容器连接
docker exec -it solbtc_postgres psql -U solbtc_user -d solbtc_dca

# 使用psql客户端连接
psql -h localhost -p 5432 -U solbtc_user -d solbtc_dca
```

## 🐳 Docker管理

### 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d postgres
docker-compose up -d redis
```

### 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs postgres
docker-compose logs redis

# 实时查看日志
docker-compose logs -f
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart postgres
```

## 🔧 手动安装步骤

如果自动脚本失败，可以手动执行以下步骤：

### 1. 安装Docker
```bash
# 更新包索引
sudo apt update

# 安装必要的包
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER
```

### 2. 安装Docker Compose
```bash
# 下载Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 设置执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 3. 安装Node.js
```bash
# 添加NodeSource仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装Node.js
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 4. 安装Git
```bash
sudo apt install git -y
```

## 📝 数据库管理

### 备份数据库
```bash
# 创建备份
docker exec solbtc_postgres pg_dump -U solbtc_user solbtc_dca > backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
gzip backup_*.sql
```

### 恢复数据库
```bash
# 解压备份文件
gunzip backup_20241219_143022.sql.gz

# 恢复数据库
docker exec -i solbtc_postgres psql -U solbtc_user -d solbtc_dca < backup_20241219_143022.sql
```

### 查看数据库状态
```bash
# 查看数据库大小
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## 🔍 故障排除

### 常见问题

#### 1. Docker权限问题
```bash
# 重新登录以应用docker组权限
newgrp docker

# 或者重启系统
sudo reboot
```

#### 2. 端口被占用
```bash
# 查看端口占用
sudo netstat -tulpn | grep :5432
sudo netstat -tulpn | grep :6379

# 杀死占用进程
sudo kill -9 <PID>
```

#### 3. 数据库连接失败
```bash
# 检查Docker容器状态
docker ps

# 查看容器日志
docker logs solbtc_postgres

# 重启容器
docker-compose restart postgres
```

#### 4. Node.js依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules并重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 5. 内存不足
```bash
# 查看系统内存使用
free -h

# 清理Docker资源
docker system prune -a

# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📊 性能优化

### 数据库优化
```bash
# 查看数据库配置
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "SHOW ALL;"

# 优化PostgreSQL配置
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
"
```

### 应用优化
```bash
# 使用生产模式构建
npm run build

# 启动生产服务器
npm start

# 使用PM2管理进程
npm install -g pm2
pm2 start npm --name "solbtc-dca" -- start
pm2 save
pm2 startup
```

## 🔒 安全配置

### 防火墙设置
```bash
# 安装UFW
sudo apt install ufw

# 配置防火墙规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw enable
```

### 数据库安全
```bash
# 修改默认密码
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "
ALTER USER solbtc_user PASSWORD 'your_new_secure_password';
"

# 限制连接
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "
ALTER SYSTEM SET max_connections = 100;
SELECT pg_reload_conf();
"
```

## 📈 监控和维护

### 系统监控
```bash
# 查看系统资源使用
htop

# 查看Docker资源使用
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 日志管理
```bash
# 查看应用日志
tail -f logs/app.log

# 查看Docker日志
docker-compose logs -f

# 清理旧日志
sudo journalctl --vacuum-time=7d
```

## 🎯 生产环境部署

### 使用Nginx反向代理
```bash
# 安装Nginx
sudo apt install nginx

# 配置Nginx
sudo nano /etc/nginx/sites-available/solbtc-dca

# 启用站点
sudo ln -s /etc/nginx/sites-available/solbtc-dca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 使用SSL证书
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

---

**部署完成时间**: 2025年7月19日  
**适用系统**: Ubuntu 20.04+  
**数据库**: PostgreSQL 15  
**缓存**: Redis 7  
**应用**: Next.js 14

现在您可以在Ubuntu系统上成功运行SOLBTC-DCA交易系统！🚀 