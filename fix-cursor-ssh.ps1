# 修复 Cursor SSH 问题脚本
# 通过修改系统 PATH 来解决 Cursor 无法找到 SSH 的问题

Write-Host "=== 修复 Cursor SSH 问题 ===" -ForegroundColor Green
Write-Host ""

# 检查 Git SSH 路径
$gitBinPath = "C:\Program Files\Git\usr\bin"
$gitSshPath = "$gitBinPath\ssh.exe"

if (Test-Path $gitSshPath) {
    Write-Host "✓ 找到 Git SSH: $gitSshPath" -ForegroundColor Green
} else {
    Write-Host "✗ 未找到 Git SSH" -ForegroundColor Red
    exit 1
}

# 获取当前系统 PATH
Write-Host "检查当前系统 PATH..." -ForegroundColor Yellow
$systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")

Write-Host "系统 PATH 长度: $($systemPath.Length)" -ForegroundColor Cyan
Write-Host "用户 PATH 长度: $($userPath.Length)" -ForegroundColor Cyan

# 检查是否已包含 Git bin 路径
if ($systemPath -like "*$gitBinPath*") {
    Write-Host "✓ Git bin 路径已在系统 PATH 中" -ForegroundColor Green
} else {
    Write-Host "需要将 Git bin 路径添加到系统 PATH" -ForegroundColor Yellow
    
    # 添加到系统 PATH（需要管理员权限）
    $newSystemPath = "$gitBinPath;$systemPath"
    try {
        [Environment]::SetEnvironmentVariable("PATH", $newSystemPath, "Machine")
        Write-Host "✓ 已添加到系统 PATH" -ForegroundColor Green
    } catch {
        Write-Host "✗ 无法修改系统 PATH，需要管理员权限" -ForegroundColor Red
        Write-Host "请以管理员身份运行此脚本" -ForegroundColor Yellow
        exit 1
    }
}

# 更新当前会话的 PATH
$env:PATH = "$gitBinPath;$env:PATH"

Write-Host ""
Write-Host "测试 SSH 命令..." -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "✓ SSH 命令可用: $sshVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ SSH 命令不可用: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "测试远程连接..." -ForegroundColor Yellow
try {
    $result = ssh -o ConnectTimeout=10 solbtc-remote "echo 'SSH 连接测试成功'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 远程连接成功!" -ForegroundColor Green
    } else {
        Write-Host "✗ 远程连接失败" -ForegroundColor Red
        Write-Host "错误信息: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 连接测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 修复完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "重要提示:" -ForegroundColor Yellow
Write-Host "1. 请重启 Cursor" -ForegroundColor White
Write-Host "2. 重新尝试 Remote-SSH 连接" -ForegroundColor White
Write-Host "3. 如果仍有问题，请重启系统" -ForegroundColor White
Write-Host ""
Write-Host "如果问题仍然存在，请尝试以下方法:" -ForegroundColor Yellow
Write-Host "1. 以管理员身份运行此脚本" -ForegroundColor White
Write-Host "2. 重启系统" -ForegroundColor White
Write-Host "3. 重新安装 OpenSSH 客户端" -ForegroundColor White 