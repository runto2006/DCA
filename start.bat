@echo off
echo ========================================
echo    SOLBTC-DCA加仓系统启动脚本
echo ========================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查npm是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到npm，请检查Node.js安装
    pause
    exit /b 1
)

REM 检查PostgreSQL是否安装
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告: 未检测到PostgreSQL，请先安装PostgreSQL
    echo 下载地址: https://www.postgresql.org/download/windows/
    echo.
)

echo 检测到Node.js版本:
node --version
echo.

REM 检查环境变量文件
if not exist "env.local" (
    echo 警告: 未找到env.local文件
    echo 正在复制环境变量模板...
    copy env.example env.local
    echo 请编辑env.local文件配置您的API密钥
    echo.
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 正在安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

echo 正在启动开发服务器...
echo 服务器将在 http://localhost:3000 启动
echo 按 Ctrl+C 停止服务器
echo.

npm run dev

pause 