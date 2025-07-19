# 简化的Windows PowerShell 打包脚本
# 用于在Windows上打包项目文件，准备在Ubuntu上部署

param(
    [string]$Version = "1.0.0",
    [string]$OutputDir = ".\dist"
)

Write-Host "🚀 开始打包SOLBTC-DCA项目..." -ForegroundColor Green

# 创建输出目录
if (Test-Path $OutputDir) {
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

Write-Host "📁 创建输出目录: $OutputDir" -ForegroundColor Yellow

# 定义需要打包的文件和目录
$includeItems = @(
    "app",
    "components", 
    "lib",
    "scripts",
    "public",
    "docker-compose.yml",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "tailwind.config.js",
    "postcss.config.js",
    "tsconfig.json",
    "env.local.example",
    "supabase.sql",
    "UBUNTU_DEPLOYMENT.md",
    "Ubuntu部署完成报告.md",
    "移动止盈详细解释.md",
    "移动止盈解释功能完成报告.md"
)

Write-Host "📦 开始复制文件..." -ForegroundColor Yellow

# 复制文件和目录
foreach ($item in $includeItems) {
    if (Test-Path $item) {
        $destination = Join-Path $OutputDir $item
        if (Test-Path $item -PathType Container) {
            # 复制目录
            Copy-Item -Path $item -Destination $destination -Recurse -Force
            Write-Host "✅ 复制目录: $item" -ForegroundColor Green
        } else {
            # 复制文件
            Copy-Item -Path $item -Destination $destination -Force
            Write-Host "✅ 复制文件: $item" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ 文件不存在: $item" -ForegroundColor Yellow
    }
}

# 创建部署脚本
Write-Host "📝 创建部署脚本..." -ForegroundColor Yellow

# 创建Ubuntu自动部署脚本
$ubuntuDeployScript = @"
#!/bin/bash

echo "🚀 开始自动部署SOLBTC-DCA系统..."

# 检查是否为root用户
if [ "\$EUID" -eq 0 ]; then
    echo "❌ 请不要使用root用户运行此脚本"
    exit 1
fi

# 设置变量
PROJECT_NAME="solbtc-dca"
PROJECT_DIR="\$HOME/\$PROJECT_NAME"
BACKUP_DIR="\$HOME/\$PROJECT_NAME-backup-\$(date +%Y%m%d_%H%M%S)"

# 创建备份目录
if [ -d "\$PROJECT_DIR" ]; then
    echo "📦 创建备份..."
    mkdir -p "\$BACKUP_DIR"
    cp -r "\$PROJECT_DIR"/* "\$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ 备份已创建: \$BACKUP_DIR"
fi

# 清理旧目录
if [ -d "\$PROJECT_DIR" ]; then
    echo "🧹 清理旧目录..."
    rm -rf "\$PROJECT_DIR"
fi

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p "\$PROJECT_DIR"
cd "\$PROJECT_DIR"

# 解压项目文件
echo "📦 解压项目文件..."
tar -xzf ../solbtc-dca-\$VERSION.tar.gz

# 设置环境变量
echo "⚙️ 设置环境变量..."
if [ ! -f .env.local ]; then
    cp env.local.example .env.local
    echo "✅ 环境配置文件已创建"
    echo "💡 请编辑 .env.local 文件配置币安API密钥"
else
    echo "✅ 环境配置文件已存在"
fi

# 安装Docker（如果未安装）
if ! command -v docker &> /dev/null; then
    echo "🐳 安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker \$USER
    rm get-docker.sh
    echo "✅ Docker安装完成"
    echo "⚠️ 请重新登录或重启系统以应用Docker权限"
else
    echo "✅ Docker已安装"
fi

# 安装Docker Compose（如果未安装）
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose安装完成"
else
    echo "✅ Docker Compose已安装"
fi

# 安装Node.js（如果未安装）
if ! command -v node &> /dev/null; then
    echo "📦 安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js安装完成"
else
    echo "✅ Node.js已安装"
fi

# 启动数据库
echo "🗄️ 启动PostgreSQL数据库..."
docker-compose up -d postgres
echo "⏳ 等待数据库启动..."
sleep 15

# 测试数据库连接
echo "🔍 测试数据库连接..."
docker exec solbtc_postgres psql -U solbtc_user -d solbtc_dca -c "SELECT version();" 2>/dev/null
if [ \$? -eq 0 ]; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败，请检查Docker容器状态"
    docker ps
    exit 1
fi

# 初始化数据库
echo "📊 初始化数据库..."
node scripts/init-database.js
if [ \$? -eq 0 ]; then
    echo "✅ 数据库初始化成功"
else
    echo "❌ 数据库初始化失败"
    exit 1
fi

# 安装Node.js依赖
echo "📦 安装Node.js依赖..."
npm install
if [ \$? -eq 0 ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 构建项目
echo "🔨 构建项目..."
npm run build
if [ \$? -eq 0 ]; then
    echo "✅ 项目构建成功"
else
    echo "❌ 项目构建失败"
    exit 1
fi

echo ""
echo "🎉 SOLBTC-DCA系统部署完成！"
echo ""
echo "📋 下一步操作："
echo "1. 配置币安API密钥：nano .env.local"
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
echo "🐳 Docker管理："
echo "- 启动服务: docker-compose up -d"
echo "- 停止服务: docker-compose down"
echo "- 查看日志: docker-compose logs"
echo ""
echo "📦 备份位置: \$BACKUP_DIR"
"@

$ubuntuDeployScript | Out-File -FilePath (Join-Path $OutputDir "deploy-ubuntu.sh") -Encoding UTF8

# 创建版本信息文件
$versionInfo = @"
{
    "version": "$Version",
    "buildDate": "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "buildSystem": "Windows",
    "targetSystem": "Ubuntu",
    "databasePassword": "runto2015",
    "description": "SOLBTC-DCA交易系统Ubuntu部署包"
}
"@

$versionInfo | Out-File -FilePath (Join-Path $OutputDir "version.json") -Encoding UTF8

# 创建README文件
$readmeContent = @"
# SOLBTC-DCA Ubuntu部署包

## 📋 包信息
- 版本: $Version
- 构建日期: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- 目标系统: Ubuntu 20.04+
- 数据库密码: runto2015

## 🚀 快速部署

### 1. 上传文件到Ubuntu服务器
\`\`\`bash
# 使用scp上传
scp solbtc-dca-$Version.tar.gz user@your-server:/home/user/

# 或使用其他方式上传到Ubuntu服务器
\`\`\`

### 2. 在Ubuntu服务器上执行
\`\`\`bash
# 解压部署包
tar -xzf solbtc-dca-$Version.tar.gz

# 运行自动部署脚本
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
\`\`\`

### 3. 配置环境变量
\`\`\`bash
# 编辑环境配置文件
nano .env.local

# 配置币安API密钥
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
\`\`\`

### 4. 启动应用
\`\`\`bash
# 启动开发服务器
npm run dev

# 或启动生产服务器
npm start
\`\`\`

## 📊 系统要求
- Ubuntu 20.04 LTS 或更高版本
- 至少 4GB RAM
- 至少 20GB 可用磁盘空间
- 网络连接

## 🔧 故障排除
如果部署失败，请检查：
1. Docker服务是否正常运行
2. 端口5432和6379是否被占用
3. 用户是否有Docker权限
4. 网络连接是否正常

## 📞 支持
如有问题，请查看部署日志或联系技术支持。
"@

$readmeContent | Out-File -FilePath (Join-Path $OutputDir "README.md") -Encoding UTF8

# 创建压缩包
Write-Host "📦 创建压缩包..." -ForegroundColor Yellow
$packageName = "solbtc-dca-$Version.tar.gz"
$packagePath = Join-Path (Split-Path $OutputDir -Parent) $packageName

# 使用PowerShell压缩
try {
    Compress-Archive -Path "$OutputDir\*" -DestinationPath $packagePath -Force
    Write-Host "✅ 压缩包创建成功: $packagePath" -ForegroundColor Green
} catch {
    Write-Host "❌ 压缩包创建失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 请检查磁盘空间和文件权限" -ForegroundColor Yellow
}

# 清理临时目录
Write-Host "🧹 清理临时文件..." -ForegroundColor Yellow
Remove-Item $OutputDir -Recurse -Force

# 显示结果
Write-Host ""
Write-Host "🎉 打包完成！" -ForegroundColor Green
Write-Host "📦 部署包: $packagePath" -ForegroundColor Cyan
if (Test-Path $packagePath) {
    Write-Host "📋 包大小: $((Get-Item $packagePath).Length / 1MB) MB" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "📤 下一步操作：" -ForegroundColor Yellow
Write-Host "1. 将 $packageName 上传到Ubuntu服务器" -ForegroundColor White
Write-Host "2. 在Ubuntu服务器上解压: tar -xzf $packageName" -ForegroundColor White
Write-Host "3. 运行部署脚本: chmod +x deploy-ubuntu.sh && ./deploy-ubuntu.sh" -ForegroundColor White
Write-Host ""
Write-Host "📚 详细说明请查看 README.md" -ForegroundColor Yellow 