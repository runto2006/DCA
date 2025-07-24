# 更新 SSH 配置文件脚本

Write-Host "=== 更新 SSH 配置文件 ===" -ForegroundColor Green
Write-Host ""

# 新的配置内容
$newConfig = @"
# Cursor Remote-SSH 配置
Host solbtc-remote
    HostName 43.163.241.83
    User ubuntu
    IdentityFile ~/.ssh/id_rsa_solbtc
    Port 22
    ForwardAgent yes
    TCPKeepAlive yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Compression yes
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
"@

# 写入配置文件
$configPath = "$env:USERPROFILE\.ssh\config"
$newConfig | Set-Content $configPath

Write-Host "✓ SSH 配置文件已更新" -ForegroundColor Green
Write-Host "配置文件路径: $configPath" -ForegroundColor Cyan

Write-Host ""
Write-Host "新的配置内容:" -ForegroundColor Yellow
Get-Content $configPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "现在测试无密码连接..." -ForegroundColor Yellow

# 测试连接
try {
    $result = ssh -o ConnectTimeout=10 solbtc-remote "echo '无密码连接测试成功'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 无密码连接成功!" -ForegroundColor Green
    } else {
        Write-Host "✗ 无密码连接失败" -ForegroundColor Red
        Write-Host "错误信息: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 连接测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 配置完成 ===" -ForegroundColor Green 