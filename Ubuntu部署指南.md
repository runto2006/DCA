# SOLBTC DCA 系统 Ubuntu 服务器部署指南

## 1. 服务器环境准备

### 1.1 更新系统
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 安装 Node.js 和 npm
```bash
# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 1.3 安装 Git
```bash
sudo apt install git -y
```

### 1.4 安装 PM2 (进程管理器)
```bash
sudo npm install -g pm2
```

## 2. 项目部署

### 2.1 克隆项目
```bash
cd /home/ubuntu
git clone https://github.com/runto2006/DCA.git
cd DCA
```

### 2.2 安装依赖
```bash
npm install
```

### 2.3 环境配置
```bash
# 复制环境配置文件
cp .env.example .env.local

# 编辑环境配置
nano .env.local
```

### 2.4 配置环境变量
在 `.env.local` 文件中配置以下变量：
```env
# 数据库配置
DATABASE_URL=your_database_url

# 交易所API配置
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# 其他交易所配置...
```

## 3. 构建和启动

### 3.1 构建项目
```bash
npm run build
```

### 3.2 使用 PM2 启动
```bash
# 启动应用
pm2 start npm --name "solbtc-dca" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs solbtc-dca
```

### 3.3 或者直接启动开发模式
```bash
npm run dev
```

## 4. Nginx 配置 (可选)

### 4.1 安装 Nginx
```bash
sudo apt install nginx -y
```

### 4.2 配置 Nginx
```bash
sudo nano /etc/nginx/sites-available/solbtc-dca
```

添加以下配置：
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.3 启用站点
```bash
sudo ln -s /etc/nginx/sites-available/solbtc-dca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. 防火墙配置

### 5.1 配置 UFW
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 6. SSL 证书 (可选)

### 6.1 安装 Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 6.2 获取 SSL 证书
```bash
sudo certbot --nginx -d your_domain.com
```

## 7. 监控和维护

### 7.1 查看应用状态
```bash
pm2 status
pm2 logs solbtc-dca
```

### 7.2 重启应用
```bash
pm2 restart solbtc-dca
```

### 7.3 更新代码
```bash
cd /home/ubuntu/DCA
git pull origin main
npm install
npm run build
pm2 restart solbtc-dca
```

## 8. 故障排除

### 8.1 检查端口占用
```bash
sudo netstat -tlnp | grep :3000
```

### 8.2 检查日志
```bash
pm2 logs solbtc-dca --lines 100
```

### 8.3 检查系统资源
```bash
htop
df -h
free -h
```

## 9. 安全建议

1. 定期更新系统和依赖包
2. 使用强密码和 SSH 密钥
3. 配置防火墙规则
4. 定期备份数据
5. 监控系统资源使用情况

## 10. 联系支持

如果遇到问题，请检查：
1. 应用日志：`pm2 logs solbtc-dca`
2. 系统日志：`sudo journalctl -u nginx`
3. 网络连接：`curl http://localhost:3000`

---

**注意：** 请根据您的实际服务器配置和域名修改相应的配置项。 