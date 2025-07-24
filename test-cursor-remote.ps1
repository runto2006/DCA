# Cursor Remote-SSH 连接测试脚本

Write-Host "=== Cursor Remote-SSH 连接测试 ===" -ForegroundColor Green
Write-Host ""

# 检查 SSH 客户端
Write-Host "1. 检查 SSH 客户端..." -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "✓ SSH 客户端可用: $sshVersion" -ForegroundColor Green
} catch {
    # 尝试使用 Git SSH
    $gitSshPath = "C:\Program Files\Git\usr\bin\ssh.exe"
    if (Test-Path $gitSshPath) {
        try {
            $sshVersion = & $gitSshPath -V 2>&1
            Write-Host "✓ 使用 Git SSH: $sshVersion" -ForegroundColor Green
        } catch {
            Write-Host "✗ SSH 客户端不可用" -ForegroundColor Red
            Write-Host "请先安装 OpenSSH 客户端或 Git for Windows" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "✗ SSH 客户端不可用" -ForegroundColor Red
        Write-Host "请先安装 OpenSSH 客户端或 Git for Windows" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# 检查 SSH 配置
Write-Host "2. 检查 SSH 配置..." -ForegroundColor Yellow
$sshConfigPath = "$env:USERPROFILE\.ssh\config"
if (Test-Path $sshConfigPath) {
    Write-Host "✓ SSH 配置文件存在" -ForegroundColor Green
    Write-Host "配置内容:" -ForegroundColor Cyan
    Get-Content $sshConfigPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "✗ SSH 配置文件不存在" -ForegroundColor Red
}

Write-Host ""

# 测试 SSH 连接
Write-Host "3. 测试 SSH 连接..." -ForegroundColor Yellow
Write-Host "正在连接到 43.163.241.83..." -ForegroundColor Cyan

try {
    # 测试连接（不执行命令，只测试连接）
    $result = ssh -o ConnectTimeout=10 solbtc-remote "echo '连接测试成功'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SSH 连接成功!" -ForegroundColor Green
    } else {
        Write-Host "✗ SSH 连接失败" -ForegroundColor Red
        Write-Host "错误信息: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 连接测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Cursor Remote-SSH 使用指南
Write-Host "4. Cursor Remote-SSH 使用指南:" -ForegroundColor Yellow
Write-Host ""
Write-Host "步骤 1: 打开 Cursor" -ForegroundColor White
Write-Host "步骤 2: 按 Ctrl+Shift+P 打开命令面板" -ForegroundColor White
Write-Host "步骤 3: 输入 'Remote-SSH: Connect to Host'" -ForegroundColor White
Write-Host "步骤 4: 选择 'solbtc-remote' 或输入 'root@43.163.241.83'" -ForegroundColor White
Write-Host "步骤 5: 选择平台类型 (Linux/Windows)" -ForegroundColor White
Write-Host "步骤 6: 输入密码 (如果需要)" -ForegroundColor White
Write-Host "步骤 7: 选择要打开的远程文件夹" -ForegroundColor White
Write-Host ""

Write-Host "如果命令面板中找不到 Remote-SSH 选项:" -ForegroundColor Yellow
Write-Host "1. 按 Ctrl+Shift+X 打开扩展面板" -ForegroundColor White
Write-Host "2. 搜索 'Remote-SSH'" -ForegroundColor White
Write-Host "3. 确保扩展已启用" -ForegroundColor White
Write-Host "4. 重启 Cursor" -ForegroundColor White

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green 