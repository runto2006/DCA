# Cursor SSH 连接卡住问题修复脚本

Write-Host "=== Cursor SSH 连接卡住问题修复 ===" -ForegroundColor Green
Write-Host ""

# 1. 强制关闭所有 Cursor 进程
Write-Host "1. 强制关闭所有 Cursor 进程..." -ForegroundColor Yellow
try {
    $cursorProcesses = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
    if ($cursorProcesses) {
        Write-Host "找到 $($cursorProcesses.Count) 个 Cursor 进程，正在关闭..." -ForegroundColor Cyan
        $cursorProcesses | Stop-Process -Force
        Write-Host "所有 Cursor 进程已关闭" -ForegroundColor Green
    } else {
        Write-Host "未找到 Cursor 进程" -ForegroundColor Green
    }
} catch {
    Write-Host "关闭进程时出错: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. 清理 SSH 控制套接字
Write-Host "2. 清理 SSH 控制套接字..." -ForegroundColor Yellow
$sshControlDir = "$env:USERPROFILE\.ssh"
$controlFiles = Get-ChildItem -Path $sshControlDir -Name "control-*" -ErrorAction SilentlyContinue
if ($controlFiles) {
    foreach ($file in $controlFiles) {
        Remove-Item "$sshControlDir\$file" -Force -ErrorAction SilentlyContinue
    }
    Write-Host "SSH 控制套接字已清理" -ForegroundColor Green
} else {
    Write-Host "未找到 SSH 控制套接字" -ForegroundColor Green
}

Write-Host ""

# 3. 测试 SSH 连接
Write-Host "3. 测试 SSH 连接..." -ForegroundColor Yellow
try {
    $result = ssh -o ConnectTimeout=10 solbtc-remote "echo 'SSH连接测试成功'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSH 连接正常" -ForegroundColor Green
    } else {
        Write-Host "SSH 连接失败" -ForegroundColor Red
    }
} catch {
    Write-Host "SSH 连接异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. 提供解决方案
Write-Host "4. 解决方案:" -ForegroundColor Yellow
Write-Host ""
Write-Host "现在请尝试以下步骤:" -ForegroundColor White
Write-Host ""
Write-Host "步骤 1: 重新启动 Cursor" -ForegroundColor Cyan
Write-Host "  - 使用管理员权限启动 Cursor" -ForegroundColor Gray
Write-Host "  - 或者运行: .\start-cursor-with-ssh.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "步骤 2: 在 Cursor 中连接 SSH" -ForegroundColor Cyan
Write-Host "  - 按 Ctrl+Shift+P 打开命令面板" -ForegroundColor Gray
Write-Host "  - 输入: Remote-SSH: Connect to Host" -ForegroundColor Gray
Write-Host "  - 选择: solbtc-remote" -ForegroundColor Gray
Write-Host ""
Write-Host "步骤 3: 如果仍然卡住" -ForegroundColor Cyan
Write-Host "  - 清理 Cursor 缓存: $env:APPDATA\Cursor\User\workspaceStorage" -ForegroundColor Gray
Write-Host "  - 或者使用命令行连接: ssh solbtc-remote" -ForegroundColor Gray
Write-Host ""

Write-Host "=== 修复完成 ===" -ForegroundColor Green 