# 手动下载安装 OpenSSH 脚本

Write-Host "=== 手动下载安装 OpenSSH ===" -ForegroundColor Green
Write-Host ""

# 创建下载目录
$downloadDir = "$env:USERPROFILE\Downloads\OpenSSH"
if (!(Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
    Write-Host "创建下载目录: $downloadDir" -ForegroundColor Cyan
}

Write-Host "正在下载 OpenSSH..." -ForegroundColor Yellow

# OpenSSH 下载链接（可能需要更新）
$opensshUrl = "https://github.com/PowerShell/Win32-OpenSSH/releases/download/v9.5.0.0p1-Beta/OpenSSH-Win64-v9.5.0.0.msi"
$downloadPath = "$downloadDir\OpenSSH-Win64.msi"

try {
    # 下载 OpenSSH
    Invoke-WebRequest -Uri $opensshUrl -OutFile $downloadPath
    Write-Host "✓ 下载完成: $downloadPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "正在安装 OpenSSH..." -ForegroundColor Yellow
    
    # 安装 OpenSSH
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$downloadPath`" /quiet" -Wait
    
    Write-Host "✓ 安装完成" -ForegroundColor Green
    
} catch {
    Write-Host "✗ 下载或安装失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动下载安装:" -ForegroundColor Yellow
    Write-Host "1. 访问: https://github.com/PowerShell/Win32-OpenSSH/releases" -ForegroundColor White
    Write-Host "2. 下载最新版本的 OpenSSH-Win64.msi" -ForegroundColor White
    Write-Host "3. 双击安装" -ForegroundColor White
}

Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "安装完成后，请重启系统并测试 SSH 命令" -ForegroundColor Yellow 