#!/bin/bash

# SOLBTC-DCA Ubuntu自动部署脚本
# 版本: 1.0.0
# 数据库密码: runto2015

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 显示欢迎信息
echo "🚀 SOLBTC-DCA Ubuntu自动部署脚本"
echo "=================================="
echo "版本: 1.0.0"
echo "数据库密码: runto2015"
echo "目标系统: Ubuntu 20.04+"
echo ""

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    log_error "请不要使用root用户运行此脚本"
    log_info "请使用普通用户运行，脚本会自动请求sudo权限"
    exit 1
fi

# 设置变量
PROJECT_NAME="solbtc-dca"
PROJECT_DIR="$HOME/$PROJECT_NAME"
BACKUP_DIR="$HOME/$PROJECT_NAME-backup-$(date +%Y%m%d_%H%M%S)"
VERSION="1.0.0"
PACKAGE_NAME="solbtc-dca-$VERSION.tar.gz"

log_info "项目目录: $PROJECT_DIR"
log_info "备份目录: $BACKUP_DIR"

# 检查部署包是否存在
if [ ! -f "$PACKAGE_NAME" ]; then
    log_error "部署包 $PACKAGE_NAME 不存在"
    log_info "请确保部署包文件在当前目录中"
    exit 1
fi

# 创建备份
if [ -d "$PROJECT_DIR" ]; then
    log_info "创建备份..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$PROJECT_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    log_success "备份已创建: $BACKUP_DIR"
fi

# 清理旧目录
if [ -d "$PROJECT_DIR" ]; then
    log_info "清理旧目录..."
    rm -rf "$PROJECT_DIR"
fi

# 创建项目目录
log_info "创建项目目录..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 解压项目文件
log_info "解压项目文件..."
tar -xzf "../$PACKAGE_NAME"
log_success "项目文件解压完成"

# 设置环境变量
log_info "设置环境变量..."
if [ ! -f .env.local ]; then
    cp env.local.example .env.local
    log_success "环境配置文件已创建"
    log_warning "请编辑 .env.local 文件配置币安API密钥"
else
    log_success "环境配置文件已存在"
fi

# 更新系统包
log_info "更新系统包..."
sudo apt update

# 安装必要的系统包
log_info "安装系统依赖..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# 安装Docker
if ! command -v docker &> /dev/null; then
    log_info "安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    log_success "Docker安装完成"
    log_warning "请重新登录或重启系统以应用Docker权限"
else
    log_success "Docker已安装"
fi

# 安装Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_info "安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose安装完成"
else
    log_success "Docker Compose已安装"
fi

# 安装Node.js
if ! command -v node &> /dev/null; then
    log_info "安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_success "Node.js安装完成"
else
    log_success "Node.js已安装"
fi

# 验证Node.js版本
NODE_VERSION=$(node --version)
log_info "Node.js版本: $NODE_VERSION"

# 验证npm版本
NPM_VERSION=$(npm --version)
log_info "npm版本: $NPM_VERSION"

# 启动数据库
log_info "启动PostgreSQL数据库..."
docker-compose up -d postgres

# 等待数据库启动
log_info "等待数据库启动..."
for i in {1..30}; do
    if docker exec solbtc_postgres pg_isready -U solbtc_user -d solbtc_dca >/dev/null 2>&1; then
        log_success "数据库启动成功"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "数据库启动超时"
        docker logs solbtc_postgres
        exit 1
    fi
    sleep 1
done

# 测试数据库连接
log_info "测试数据库连接..."
if docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "SELECT version();" >/dev/null 2>&1; then
    log_success "数据库连接成功"
else
    log_error "数据库连接失败"
    docker ps
    docker logs solbtc_postgres
    exit 1
fi

# 初始化数据库
log_info "初始化数据库..."
if node scripts/init-database.js; then
    log_success "数据库初始化成功"
else
    log_error "数据库初始化失败"
    exit 1
fi

# 安装Node.js依赖
log_info "安装Node.js依赖..."
if npm install; then
    log_success "依赖安装成功"
else
    log_error "依赖安装失败"
    exit 1
fi

# 构建项目
log_info "构建项目..."
if npm run build; then
    log_success "项目构建成功"
else
    log_error "项目构建失败"
    exit 1
fi

# 创建启动脚本
log_info "创建启动脚本..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 启动SOLBTC-DCA系统..."

# 检查数据库状态
if ! docker ps | grep -q solbtc_postgres; then
    echo "🗄️ 启动数据库..."
    docker-compose up -d postgres
    sleep 10
fi

# 启动应用
echo "🌐 启动Web应用..."
npm run dev
EOF

chmod +x start.sh

# 创建停止脚本
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 停止SOLBTC-DCA系统..."
docker-compose down
pkill -f "npm run dev" || true
echo "✅ 系统已停止"
EOF

chmod +x stop.sh

# 创建状态检查脚本
cat > status.sh << 'EOF'
#!/bin/bash
echo "📊 SOLBTC-DCA系统状态检查"
echo "=========================="

# 检查Docker容器
echo "🐳 Docker容器状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep solbtc

# 检查端口占用
echo ""
echo "🔌 端口占用情况:"
netstat -tulpn | grep -E ':(3000|5432|6379)' || echo "端口未占用"

# 检查进程
echo ""
echo "📋 相关进程:"
ps aux | grep -E "(node|npm)" | grep -v grep || echo "无相关进程"
EOF

chmod +x status.sh

# 显示完成信息
echo ""
echo "🎉 SOLBTC-DCA系统部署完成！"
echo "=========================="
echo ""
echo "📋 系统信息:"
echo "   - 项目目录: $PROJECT_DIR"
echo "   - 数据库密码: runto2015"
echo "   - 备份位置: $BACKUP_DIR"
echo ""
echo "🚀 启动系统:"
echo "   cd $PROJECT_DIR"
echo "   ./start.sh"
echo ""
echo "🛑 停止系统:"
echo "   ./stop.sh"
echo ""
echo "📊 查看状态:"
echo "   ./status.sh"
echo ""
echo "📋 下一步操作:"
echo "1. 配置币安API密钥: nano .env.local"
echo "2. 启动系统: ./start.sh"
echo "3. 访问应用: http://localhost:3000"
echo ""
echo "🗄️ 数据库信息:"
echo "   - 主机: localhost"
echo "   - 端口: 5432"
echo "   - 数据库: solbtc_dca"
echo "   - 用户: solbtc_user"
echo "   - 密码: runto2015"
echo ""
echo "🐳 Docker管理:"
echo "   - 启动服务: docker-compose up -d"
echo "   - 停止服务: docker-compose down"
echo "   - 查看日志: docker-compose logs"
echo ""
echo "📦 备份位置: $BACKUP_DIR"
echo ""
log_success "部署完成！系统已准备就绪" 