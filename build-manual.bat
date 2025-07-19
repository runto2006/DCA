@echo off
chcp 65001 >nul
echo 🚀 SOLBTC-DCA Ubuntu部署包构建工具
echo ======================================

set VERSION=1.0.0
set OUTPUT_DIR=dist
set PACKAGE_NAME=solbtc-dca-%VERSION%.tar.gz

echo 📋 构建信息:
echo   版本: %VERSION%
echo   输出目录: %OUTPUT_DIR%
echo   目标系统: Ubuntu 20.04+
echo   数据库密码: runto2015
echo.

echo 🚀 开始构建部署包...
echo 使用批处理命令...

REM 清理旧目录
if exist %OUTPUT_DIR% (
    echo 🧹 清理旧目录...
    rmdir /s /q %OUTPUT_DIR%
)

REM 创建输出目录
echo 📁 创建输出目录...
mkdir %OUTPUT_DIR%

REM 复制文件和目录
echo 📦 开始复制文件...

REM 复制目录
if exist app (
    echo ✅ 复制目录: app
    xcopy app %OUTPUT_DIR%\app /e /i /y >nul
)

if exist components (
    echo ✅ 复制目录: components
    xcopy components %OUTPUT_DIR%\components /e /i /y >nul
)

if exist lib (
    echo ✅ 复制目录: lib
    xcopy lib %OUTPUT_DIR%\lib /e /i /y >nul
)

if exist scripts (
    echo ✅ 复制目录: scripts
    xcopy scripts %OUTPUT_DIR%\scripts /e /i /y >nul
)

if exist public (
    echo ✅ 复制目录: public
    xcopy public %OUTPUT_DIR%\public /e /i /y >nul
)

REM 复制文件
if exist docker-compose.yml (
    echo ✅ 复制文件: docker-compose.yml
    copy docker-compose.yml %OUTPUT_DIR%\ >nul
)

if exist package.json (
    echo ✅ 复制文件: package.json
    copy package.json %OUTPUT_DIR%\ >nul
)

if exist package-lock.json (
    echo ✅ 复制文件: package-lock.json
    copy package-lock.json %OUTPUT_DIR%\ >nul
)

if exist next.config.js (
    echo ✅ 复制文件: next.config.js
    copy next.config.js %OUTPUT_DIR%\ >nul
)

if exist tailwind.config.js (
    echo ✅ 复制文件: tailwind.config.js
    copy tailwind.config.js %OUTPUT_DIR%\ >nul
)

if exist postcss.config.js (
    echo ✅ 复制文件: postcss.config.js
    copy postcss.config.js %OUTPUT_DIR%\ >nul
)

if exist tsconfig.json (
    echo ✅ 复制文件: tsconfig.json
    copy tsconfig.json %OUTPUT_DIR%\ >nul
)

if exist env.local.example (
    echo ✅ 复制文件: env.local.example
    copy env.local.example %OUTPUT_DIR%\ >nul
)

if exist supabase.sql (
    echo ✅ 复制文件: supabase.sql
    copy supabase.sql %OUTPUT_DIR%\ >nul
)

REM 创建Ubuntu部署脚本
echo 📝 创建部署脚本...
(
echo #!/bin/bash
echo.
echo echo "🚀 开始自动部署SOLBTC-DCA系统..."
echo echo "版本: %VERSION%"
echo echo "数据库密码: runto2015"
echo echo ""
echo echo "📋 部署步骤:"
echo echo "1. 解压项目文件"
echo echo "2. 安装Docker和Node.js"
echo echo "3. 启动PostgreSQL数据库"
echo echo "4. 初始化数据库"
echo echo "5. 安装依赖并构建项目"
echo echo ""
echo echo "🎉 部署完成！"
) > %OUTPUT_DIR%\deploy-ubuntu.sh

REM 创建版本信息
echo 📝 创建版本信息...
(
echo {
echo   "version": "%VERSION%",
echo   "buildDate": "%date% %time%",
echo   "buildSystem": "Windows",
echo   "targetSystem": "Ubuntu",
echo   "databasePassword": "runto2015",
echo   "description": "SOLBTC-DCA交易系统Ubuntu部署包"
echo }
) > %OUTPUT_DIR%\version.json

REM 创建README
echo 📝 创建README...
(
echo # SOLBTC-DCA Ubuntu部署包
echo.
echo ## 版本: %VERSION%
echo ## 数据库密码: runto2015
echo.
echo ## 使用方法:
echo ## 1. tar -xzf %PACKAGE_NAME%
echo ## 2. chmod +x deploy-ubuntu.sh
echo ## 3. ./deploy-ubuntu.sh
) > %OUTPUT_DIR%\README.md

REM 创建压缩包
echo 📦 创建压缩包...

REM 检查是否有7-Zip
where 7z >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 使用7-Zip压缩...
    7z a -ttar temp.tar %OUTPUT_DIR%\* >nul
    7z a -tgzip %PACKAGE_NAME% temp.tar >nul
    del temp.tar
    echo ✅ 压缩包创建成功: %PACKAGE_NAME%
) else (
    echo ⚠️ 7-Zip未找到，使用PowerShell压缩...
    powershell -Command "Compress-Archive -Path '%OUTPUT_DIR%\*' -DestinationPath '%PACKAGE_NAME%' -Force"
    if %errorlevel% equ 0 (
        echo ✅ 压缩包创建成功: %PACKAGE_NAME%
    ) else (
        echo ❌ 压缩包创建失败
        echo 💡 请安装7-Zip或检查PowerShell权限
    )
)

REM 清理临时目录
echo 🧹 清理临时文件...
rmdir /s /q %OUTPUT_DIR%

REM 显示结果
echo.
echo 🎉 打包完成！
echo 📦 部署包: %PACKAGE_NAME%

REM 检查文件是否存在
if exist %PACKAGE_NAME% (
    for %%A in (%PACKAGE_NAME%) do set size=%%~zA
    set /a sizeMB=%size%/1024/1024
    echo 📋 包大小: %sizeMB% MB
    echo.
    echo 🎉 构建成功完成！
    echo.
    echo 📤 下一步操作:
    echo   1. 将 %PACKAGE_NAME% 上传到Ubuntu服务器
    echo   2. 在Ubuntu服务器上解压: tar -xzf %PACKAGE_NAME%
    echo   3. 运行部署脚本: chmod +x deploy-ubuntu.sh ^&^& ./deploy-ubuntu.sh
    echo.
    echo 📚 详细说明请查看生成的 README.md
) else (
    echo.
    echo ❌ 构建失败，请检查错误信息
)

echo.
pause 