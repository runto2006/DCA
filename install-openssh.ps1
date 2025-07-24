# Windows 11 OpenSSH 客户端安装脚本
# 需要以管理员权限运行

Write-Host "=== Windows 11 OpenSSH 客户端安装 ===" -ForegroundColor Green
Write-Host ""

# 检查管理员权限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "错误：此脚本需要管理员权限运行" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell 选择 '以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ 管理员权限确认" -ForegroundColor Green
Write-Host ""

# 检查是否已安装
Write-Host "1. 检查 OpenSSH 客户端状态..." -ForegroundColor Yellow
$installed = Get-WindowsCapability -Online | Where-Object {$_.Name -like "OpenSSH.Client*" -and $_.State -eq "Installed"}

if ($installed) {
    Write-Host "✓ OpenSSH 客户端已安装" -ForegroundColor Green
    Write-Host "版本: $($installed.Name)" -ForegroundColor Cyan
} else {
    Write-Host "OpenSSH 客户端未安装，开始安装..." -ForegroundColor Yellow
    
    # 查找可用的 OpenSSH 客户端
    $available = Get-WindowsCapability -Online | Where-Object {$_.Name -like "OpenSSH.Client*"}
    
    if ($available) {
        Write-Host "找到可用的 OpenSSH 客户端: $($available.Name)" -ForegroundColor Cyan
        
        try {
            # 安装 OpenSSH 客户端
            Write-Host "2. 正在安装 OpenSSH 客户端..." -ForegroundColor Yellow
            $result = Add-WindowsCapability -Online -Name $available.Name
            
            if ($result.RestartNeeded) {
                Write-Host "✓ 安装成功，需要重启系统" -ForegroundColor Green
                Write-Host "请重启系统后再次运行此脚本验证安装" -ForegroundColor Yellow
            } else {
                Write-Host "✓ 安装成功" -ForegroundColor Green
            }
        } catch {
            Write-Host "安装失败: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "未找到可用的 OpenSSH 客户端" -ForegroundColor Red
        Write-Host "请检查网络连接或手动安装" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# 验证安装
Write-Host "3. 验证安装..." -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "✓ SSH 客户端可用: $sshVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ SSH 客户端不可用" -ForegroundColor Red
    Write-Host "可能需要重启系统或重新安装" -ForegroundColor Yellow
}

Write-Host ""

# 测试基本功能
Write-Host "4. 测试 SSH 基本功能..." -ForegroundColor Yellow
try {
    $help = ssh -h 2>&1 | Select-Object -First 3
    Write-Host "✓ SSH 帮助信息:" -ForegroundColor Green
    $help | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} catch {
    Write-Host "✗ SSH 功能测试失败" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 如果提示需要重启，请重启系统" -ForegroundColor White
Write-Host "2. 运行测试脚本验证连接: .\test-remote-connection.ps1" -ForegroundColor White
Write-Host "3. 在 Cursor 中配置 Remote-SSH" -ForegroundColor White 