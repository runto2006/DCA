# 修复 SSH 路径问题脚本
# 将 Git SSH 添加到系统 PATH

Write-Host "=== 修复 SSH 路径问题 ===" -ForegroundColor Green
Write-Host ""

# 检查 Git SSH 路径
$gitSshPath = "C:\Program Files\Git\usr\bin"
if (Test-Path $gitSshPath) {
    Write-Host "✓ 找到 Git SSH 路径: $gitSshPath" -ForegroundColor Green
} else {
    Write-Host "✗ 未找到 Git SSH 路径" -ForegroundColor Red
    exit 1
}

# 检查当前 PATH
Write-Host "检查当前 PATH..." -ForegroundColor Yellow
$currentPath = $env:PATH
$pathParts = $currentPath -split ';'

# 检查是否已包含 Git SSH 路径
if ($pathParts -contains $gitSshPath) {
    Write-Host "✓ Git SSH 路径已在 PATH 中" -ForegroundColor Green
} else {
    Write-Host "需要将 Git SSH 路径添加到 PATH" -ForegroundColor Yellow
    
    # 添加到用户 PATH（不需要管理员权限）
    $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -notlike "*$gitSshPath*") {
        $newUserPath = "$userPath;$gitSshPath"
        [Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
        Write-Host "✓ 已添加到用户 PATH" -ForegroundColor Green
    }
    
    # 更新当前会话的 PATH
    $env:PATH = "$env:PATH;$gitSshPath"
    Write-Host "✓ 已更新当前会话 PATH" -ForegroundColor Green
}

Write-Host ""

# 测试 SSH 命令
Write-Host "测试 SSH 命令..." -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "✓ SSH 命令可用: $sshVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ SSH 命令不可用: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试远程连接
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
Write-Host "1. 请重新启动 Cursor" -ForegroundColor White
Write-Host "2. 重新尝试 Remote-SSH 连接" -ForegroundColor White
Write-Host "3. 如果仍有问题，请重启系统" -ForegroundColor White 