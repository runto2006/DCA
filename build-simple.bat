@echo off
chcp 65001 >nul
echo 🚀 SOLBTC-DCA Ubuntu部署包构建工具
echo ======================================

set VERSION=1.0.0
set OUTPUT_DIR=dist

echo 📋 构建信息:
echo   版本: %VERSION%
echo   输出目录: %OUTPUT_DIR%
echo   目标系统: Ubuntu 20.04+
echo   数据库密码: runto2015
echo.

echo 🔍 检查PowerShell...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell不可用，请确保已安装PowerShell
    pause
    exit /b 1
)

echo ✅ PowerShell可用
echo.

echo 🚀 开始构建部署包...
echo 使用简化PowerShell脚本...

powershell -ExecutionPolicy Bypass -File "build-package-simple.ps1" -Version %VERSION% -OutputDir %OUTPUT_DIR%

if %errorlevel% equ 0 (
    echo.
    echo 🎉 构建成功完成！
    echo.
    echo 📦 部署包位置: solbtc-dca-%VERSION%.tar.gz
    echo.
    echo 📤 下一步操作:
    echo   1. 将 solbtc-dca-%VERSION%.tar.gz 上传到Ubuntu服务器
    echo   2. 在Ubuntu服务器上解压: tar -xzf solbtc-dca-%VERSION%.tar.gz
    echo   3. 运行部署脚本: chmod +x deploy-ubuntu.sh ^&^& ./deploy-ubuntu.sh
    echo.
    echo 📚 详细说明请查看生成的 README.md
) else (
    echo.
    echo ❌ 构建失败，请检查错误信息
)

echo.
pause 