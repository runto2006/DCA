# Cursor SSH 连接卡住问题解决脚本

Write-Host "=== Cursor SSH 连接卡住问题解决 ===" -ForegroundColor Green
Write-Host ""

# 1. 检查 Cursor 进程
Write-Host "1. 检查 Cursor 进程..." -ForegroundColor Yellow
$cursorProcesses = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($cursorProcesses) {
    Write-Host "找到 $($cursorProcesses.Count) 个 Cursor 进程" -ForegroundColor Cyan
    $cursorProcesses | ForEach-Object {
        Write-Host "  PID: $($_.Id), 内存: $([math]::Round($_.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "未找到 Cursor 进程" -ForegroundColor Red
}

Write-Host ""

# 2. 检查 SSH 连接状态
Write-Host "2. 检查 SSH 连接状态..." -ForegroundColor Yellow
try {
    $sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes solbtc-remote "echo 'SSH连接正常'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SSH 连接正常" -ForegroundColor Green
    } else {
        Write-Host "✗ SSH 连接失败: $sshTest" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ SSH 连接异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. 清理可能的连接残留
Write-Host "3. 清理连接残留..." -ForegroundColor Yellow

# 检查并清理 SSH 控制套接字
$sshControlPath = "$env:USERPROFILE\.ssh\control-%h-%p-%r"
if (Test-Path $sshControlPath) {
    Write-Host "找到 SSH 控制套接字，正在清理..." -ForegroundColor Cyan
    Remove-Item $sshControlPath -Force -ErrorAction SilentlyContinue
    Write-Host "✓ SSH 控制套接字已清理" -ForegroundColor Green
} else {
    Write-Host "✓ 未找到 SSH 控制套接字" -ForegroundColor Green
}

# 4. 重置 SSH 配置
Write-Host "4. 重置 SSH 配置..." -ForegroundColor Yellow
$sshConfigPath = "$env:USERPROFILE\.ssh\config"
if (Test-Path $sshConfigPath) {
    $configContent = Get-Content $sshConfigPath
    $newConfig = @"
# Cursor Remote-SSH 配置 (重置版)
Host solbtc-remote
    HostName 43.163.241.83
    User ubuntu
    IdentityFile ~/.ssh/id_rsa_solbtc
    Port 22
    ForwardAgent yes
    TCPKeepAlive yes
    ServerAliveInterval 30
    ServerAliveCountMax 6
    Compression yes
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    ControlMaster auto
    ControlPath ~/.ssh/control-%h-%p-%r
    ControlPersist 10m
"@
    
    Set-Content -Path $sshConfigPath -Value $newConfig -Encoding UTF8
    Write-Host "✓ SSH 配置已重置" -ForegroundColor Green
}

Write-Host ""

# 5. 解决方案建议
Write-Host "5. 解决方案建议:" -ForegroundColor Yellow
Write-Host ""
Write-Host "如果 Cursor 仍然卡住，请尝试以下步骤:" -ForegroundColor White
Write-Host ""
Write-Host "步骤 1: 强制关闭 Cursor" -ForegroundColor Cyan
Write-Host "  - 按 Ctrl+Alt+Delete，选择任务管理器" -ForegroundColor Gray
Write-Host "  - 找到所有 Cursor 进程并结束它们" -ForegroundColor Gray
Write-Host ""
Write-Host "步骤 2: 清理 Cursor 缓存" -ForegroundColor Cyan
$cursorCachePath = "$env:APPDATA\Cursor\User\workspaceStorage"
if (Test-Path $cursorCachePath) {
    Write-Host "  - 缓存路径: $cursorCachePath" -ForegroundColor Gray
    Write-Host "  - 可以删除此文件夹来清理缓存" -ForegroundColor Gray
}
Write-Host ""
Write-Host "步骤 3: 重新启动 Cursor" -ForegroundColor Cyan
Write-Host "  - 使用管理员权限启动 Cursor" -ForegroundColor Gray
Write-Host "  - 或者使用我们的启动脚本: .\start-cursor-with-ssh.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "步骤 4: 使用命令行连接" -ForegroundColor Cyan
Write-Host "  - 如果 GUI 连接失败，可以尝试命令行连接" -ForegroundColor Gray
Write-Host "  - 运行: ssh solbtc-remote" -ForegroundColor Gray
Write-Host ""

# 6. 提供快速修复命令
Write-Host "6. 快速修复命令:" -ForegroundColor Yellow
Write-Host ""
Write-Host "要强制关闭所有 Cursor 进程，请运行:" -ForegroundColor White
Write-Host "  Get-Process -Name 'Cursor' -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Cyan
Write-Host ""
Write-Host "要清理 Cursor 缓存，请运行:" -ForegroundColor White
Write-Host "  Remove-Item '$cursorCachePath' -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== 解决脚本完成 ===" -ForegroundColor Green 