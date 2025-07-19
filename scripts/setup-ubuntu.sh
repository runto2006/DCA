#!/bin/bash

echo "🚀 开始设置Ubuntu本地开发环境..."

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装Docker
echo "🐳 安装Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker安装完成"
else
    echo "✅ Docker已安装"
fi

# 安装Docker Compose
echo "🐳 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose安装完成"
else
    echo "✅ Docker Compose已安装"
fi

# 安装Node.js
echo "📦 安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js安装完成"
else
    echo "✅ Node.js已安装"
fi

# 安装Git
echo "📦 安装Git..."
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo "✅ Git安装完成"
else
    echo "✅ Git已安装"
fi

# 创建项目目录
echo "📁 创建项目目录..."
PROJECT_DIR="$HOME/solbtc-dca"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 复制项目文件
echo "📋 复制项目文件..."
# 这里假设项目文件已经在当前目录
cp -r . $PROJECT_DIR/

# 设置环境变量
echo "⚙️ 设置环境变量..."
if [ ! -f .env.local ]; then
    cp env.local.example .env.local
    echo "✅ 环境配置文件已创建"
else
    echo "✅ 环境配置文件已存在"
fi

# 启动数据库
echo "🗄️ 启动PostgreSQL数据库..."
docker-compose up -d postgres
echo "⏳ 等待数据库启动..."
sleep 10

# 测试数据库连接
echo "🔍 测试数据库连接..."
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "SELECT version();"

# 安装Node.js依赖
echo "📦 安装Node.js依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

echo "🎉 Ubuntu本地开发环境设置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 配置币安API密钥（编辑 .env.local 文件）"
echo "2. 启动开发服务器：npm run dev"
echo "3. 访问应用：http://localhost:3000"
echo ""
echo "🗄️ 数据库信息："
echo "- 主机: localhost"
echo "- 端口: 5432"
echo "- 数据库: solbtc_dca"
echo "- 用户: solbtc_user"
echo "- 密码: runto2015"
echo ""
echo "🐳 Docker容器管理："
echo "- 启动数据库: docker-compose up -d"
echo "- 停止数据库: docker-compose down"
echo "- 查看日志: docker-compose logs" 