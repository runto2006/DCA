# 创建 SSH 可执行文件链接脚本
# 解决 Cursor 无法找到 SSH 命令的问题

Write-Host "=== 创建 SSH 可执行文件链接 ===" -ForegroundColor Green
Write-Host ""

# 检查 Git SSH 路径
$gitSshPath = "C:\Program Files\Git\usr\bin\ssh.exe"
if (Test-Path $gitSshPath) {
    Write-Host "✓ 找到 Git SSH: $gitSshPath" -ForegroundColor Green
} else {
    Write-Host "✗ 未找到 Git SSH" -ForegroundColor Red
    exit 1
}

# 创建目标目录
$targetDir = "$env:USERPROFILE\AppData\Local\Microsoft\WinGet\Packages"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "创建目标目录: $targetDir" -ForegroundColor Cyan
}

# 创建 SSH 可执行文件
$sshExePath = "$targetDir\ssh.exe"
Write-Host "创建 SSH 可执行文件: $sshExePath" -ForegroundColor Yellow

# 创建批处理文件来调用 Git SSH
$batchContent = @"
@echo off
"C:\Program Files\Git\usr\bin\ssh.exe" %*
"@

$batchContent | Set-Content -Path $sshExePath -Encoding ASCII

Write-Host "✓ SSH 可执行文件已创建" -ForegroundColor Green

# 测试 SSH 可执行文件
Write-Host ""
Write-Host "测试 SSH 可执行文件..." -ForegroundColor Yellow
try {
    $version = & $sshExePath -V 2>&1
    Write-Host "✓ SSH 可执行文件测试成功: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ SSH 可执行文件测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 创建环境变量
Write-Host "设置环境变量..." -ForegroundColor Yellow
$env:SSH_PATH = $targetDir
[Environment]::SetEnvironmentVariable("SSH_PATH", $targetDir, "User")

Write-Host "✓ 环境变量已设置" -ForegroundColor Green

Write-Host ""
Write-Host "=== 创建完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 重启 Cursor" -ForegroundColor White
Write-Host "2. 重新尝试 Remote-SSH 连接" -ForegroundColor White
Write-Host "3. 如果仍有问题，请重启系统" -ForegroundColor White
Write-Host ""
Write-Host "SSH 可执行文件路径: $sshExePath" -ForegroundColor Cyan 