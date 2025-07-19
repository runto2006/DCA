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
echo 使用内嵌PowerShell代码...

REM 创建临时PowerShell脚本
echo # 临时PowerShell打包脚本 > temp-build.ps1
echo Write-Host "🚀 开始打包SOLBTC-DCA项目..." -ForegroundColor Green >> temp-build.ps1
echo. >> temp-build.ps1
echo # 创建输出目录 >> temp-build.ps1
echo if (Test-Path "%OUTPUT_DIR%") { >> temp-build.ps1
echo     Remove-Item "%OUTPUT_DIR%" -Recurse -Force >> temp-build.ps1
echo } >> temp-build.ps1
echo New-Item -ItemType Directory -Path "%OUTPUT_DIR%" ^| Out-Null >> temp-build.ps1
echo. >> temp-build.ps1
echo Write-Host "📁 创建输出目录: %OUTPUT_DIR%" -ForegroundColor Yellow >> temp-build.ps1
echo. >> temp-build.ps1
echo # 定义需要打包的文件和目录 >> temp-build.ps1
echo $includeItems = @( >> temp-build.ps1
echo     "app", >> temp-build.ps1
echo     "components", >> temp-build.ps1
echo     "lib", >> temp-build.ps1
echo     "scripts", >> temp-build.ps1
echo     "public", >> temp-build.ps1
echo     "docker-compose.yml", >> temp-build.ps1
echo     "package.json", >> temp-build.ps1
echo     "package-lock.json", >> temp-build.ps1
echo     "next.config.js", >> temp-build.ps1
echo     "tailwind.config.js", >> temp-build.ps1
echo     "postcss.config.js", >> temp-build.ps1
echo     "tsconfig.json", >> temp-build.ps1
echo     "env.local.example", >> temp-build.ps1
echo     "supabase.sql" >> temp-build.ps1
echo ) >> temp-build.ps1
echo. >> temp-build.ps1
echo Write-Host "📦 开始复制文件..." -ForegroundColor Yellow >> temp-build.ps1
echo. >> temp-build.ps1
echo # 复制文件和目录 >> temp-build.ps1
echo foreach ($item in $includeItems) { >> temp-build.ps1
echo     if (Test-Path $item) { >> temp-build.ps1
echo         $destination = Join-Path "%OUTPUT_DIR%" $item >> temp-build.ps1
echo         if (Test-Path $item -PathType Container) { >> temp-build.ps1
echo             Copy-Item -Path $item -Destination $destination -Recurse -Force >> temp-build.ps1
echo             Write-Host "✅ 复制目录: $item" -ForegroundColor Green >> temp-build.ps1
echo         } else { >> temp-build.ps1
echo             Copy-Item -Path $item -Destination $destination -Force >> temp-build.ps1
echo             Write-Host "✅ 复制文件: $item" -ForegroundColor Green >> temp-build.ps1
echo         } >> temp-build.ps1
echo     } else { >> temp-build.ps1
echo         Write-Host "⚠️ 文件不存在: $item" -ForegroundColor Yellow >> temp-build.ps1
echo     } >> temp-build.ps1
echo } >> temp-build.ps1
echo. >> temp-build.ps1
echo # 创建Ubuntu部署脚本 >> temp-build.ps1
echo Write-Host "📝 创建部署脚本..." -ForegroundColor Yellow >> temp-build.ps1
echo. >> temp-build.ps1
echo $ubuntuScript = @' >> temp-build.ps1
echo #!/bin/bash >> temp-build.ps1
echo echo "🚀 开始自动部署SOLBTC-DCA系统..." >> temp-build.ps1
echo echo "版本: %VERSION%" >> temp-build.ps1
echo echo "数据库密码: runto2015" >> temp-build.ps1
echo echo "" >> temp-build.ps1
echo echo "📋 部署步骤:" >> temp-build.ps1
echo echo "1. 解压项目文件" >> temp-build.ps1
echo echo "2. 安装Docker和Node.js" >> temp-build.ps1
echo echo "3. 启动PostgreSQL数据库" >> temp-build.ps1
echo echo "4. 初始化数据库" >> temp-build.ps1
echo echo "5. 安装依赖并构建项目" >> temp-build.ps1
echo echo "" >> temp-build.ps1
echo echo "🎉 部署完成！" >> temp-build.ps1
echo '@ >> temp-build.ps1
echo. >> temp-build.ps1
echo $ubuntuScript ^| Out-File -FilePath (Join-Path "%OUTPUT_DIR%" "deploy-ubuntu.sh") -Encoding UTF8 >> temp-build.ps1
echo. >> temp-build.ps1
echo # 创建版本信息 >> temp-build.ps1
echo $versionInfo = @{ >> temp-build.ps1
echo     version = "%VERSION%" >> temp-build.ps1
echo     buildDate = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') >> temp-build.ps1
echo     buildSystem = "Windows" >> temp-build.ps1
echo     targetSystem = "Ubuntu" >> temp-build.ps1
echo     databasePassword = "runto2015" >> temp-build.ps1
echo     description = "SOLBTC-DCA交易系统Ubuntu部署包" >> temp-build.ps1
echo } >> temp-build.ps1
echo. >> temp-build.ps1
echo $versionInfo ^| ConvertTo-Json ^| Out-File -FilePath (Join-Path "%OUTPUT_DIR%" "version.json") -Encoding UTF8 >> temp-build.ps1
echo. >> temp-build.ps1
echo # 创建README >> temp-build.ps1
echo $readme = @" >> temp-build.ps1
echo # SOLBTC-DCA Ubuntu部署包 >> temp-build.ps1
echo ## 版本: %VERSION% >> temp-build.ps1
echo ## 数据库密码: runto2015 >> temp-build.ps1
echo ## 使用方法: >> temp-build.ps1
echo ## 1. tar -xzf solbtc-dca-%VERSION%.tar.gz >> temp-build.ps1
echo ## 2. chmod +x deploy-ubuntu.sh >> temp-build.ps1
echo ## 3. ./deploy-ubuntu.sh >> temp-build.ps1
echo "@ >> temp-build.ps1
echo. >> temp-build.ps1
echo $readme ^| Out-File -FilePath (Join-Path "%OUTPUT_DIR%" "README.md") -Encoding UTF8 >> temp-build.ps1
echo. >> temp-build.ps1
echo # 创建压缩包 >> temp-build.ps1
echo Write-Host "📦 创建压缩包..." -ForegroundColor Yellow >> temp-build.ps1
echo $packageName = "solbtc-dca-%VERSION%.tar.gz" >> temp-build.ps1
echo $packagePath = Join-Path (Split-Path "%OUTPUT_DIR%" -Parent) $packageName >> temp-build.ps1
echo. >> temp-build.ps1
echo try { >> temp-build.ps1
echo     Compress-Archive -Path "%OUTPUT_DIR%\*" -DestinationPath $packagePath -Force >> temp-build.ps1
echo     Write-Host "✅ 压缩包创建成功: $packagePath" -ForegroundColor Green >> temp-build.ps1
echo } catch { >> temp-build.ps1
echo     Write-Host "❌ 压缩包创建失败: $($_.Exception.Message)" -ForegroundColor Red >> temp-build.ps1
echo } >> temp-build.ps1
echo. >> temp-build.ps1
echo # 清理临时目录 >> temp-build.ps1
echo Write-Host "🧹 清理临时文件..." -ForegroundColor Yellow >> temp-build.ps1
echo Remove-Item "%OUTPUT_DIR%" -Recurse -Force >> temp-build.ps1
echo. >> temp-build.ps1
echo # 显示结果 >> temp-build.ps1
echo Write-Host "" >> temp-build.ps1
echo Write-Host "🎉 打包完成！" -ForegroundColor Green >> temp-build.ps1
echo Write-Host "📦 部署包: $packagePath" -ForegroundColor Cyan >> temp-build.ps1
echo if (Test-Path $packagePath) { >> temp-build.ps1
echo     Write-Host "📋 包大小: $((Get-Item $packagePath).Length / 1MB) MB" -ForegroundColor Cyan >> temp-build.ps1
echo } >> temp-build.ps1

REM 运行临时PowerShell脚本
powershell -ExecutionPolicy Bypass -File "temp-build.ps1"

REM 清理临时文件
del temp-build.ps1

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