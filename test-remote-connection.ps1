# 测试远程SSH连接脚本
# 用于验证与服务器 43.163.241.83 的连接

Write-Host "=== Cursor Remote-SSH 连接测试 ===" -ForegroundColor Green
Write-Host ""

# 检查SSH客户端是否可用
Write-Host "1. 检查SSH客户端..." -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "SSH客户端可用: $sshVersion" -ForegroundColor Green
} catch {
    Write-Host "SSH客户端不可用，请先安装OpenSSH客户端" -ForegroundColor Red
    Write-Host "安装方法：Windows设置 -> 应用 -> 可选功能 -> 添加功能 -> OpenSSH客户端" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 测试SSH配置文件
Write-Host "2. 检查SSH配置文件..." -ForegroundColor Yellow
$sshConfigPath = "$env:USERPROFILE\.ssh\config"
if (Test-Path $sshConfigPath) {
    Write-Host "SSH配置文件存在: $sshConfigPath" -ForegroundColor Green
    Write-Host "配置内容:" -ForegroundColor Cyan
    Get-Content $sshConfigPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "SSH配置文件不存在" -ForegroundColor Red
}

Write-Host ""

# 测试连接
Write-Host "3. 测试SSH连接..." -ForegroundColor Yellow
Write-Host "正在连接到 43.163.241.83..." -ForegroundColor Cyan

try {
    # 使用超时设置测试连接
    $result = ssh -o ConnectTimeout=10 -o BatchMode=yes solbtc-remote "echo '连接测试成功' && uname -a" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSH连接成功!" -ForegroundColor Green
        Write-Host "服务器信息: $result" -ForegroundColor Cyan
    } else {
        Write-Host "SSH连接失败，错误信息:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
} catch {
    Write-Host "连接测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 提供Cursor配置建议
Write-Host "4. Cursor Remote-SSH 配置建议:" -ForegroundColor Yellow
Write-Host "   - 打开Cursor" -ForegroundColor White
Write-Host "   - 按 Ctrl+Shift+X 安装Remote-SSH扩展" -ForegroundColor White
Write-Host "   - 按 Ctrl+Shift+P 输入 'Remote-SSH: Connect to Host'" -ForegroundColor White
Write-Host "   - 选择 'solbtc-remote'" -ForegroundColor White
Write-Host "   - 选择远程平台类型（Linux/Windows）" -ForegroundColor White
Write-Host "   - 打开远程文件夹" -ForegroundColor White

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green 