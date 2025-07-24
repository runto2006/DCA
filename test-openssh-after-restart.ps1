# 测试重启后的 SSH 功能脚本

Write-Host "=== 测试 SSH 功能 ===" -ForegroundColor Green
Write-Host ""

Write-Host "检查 SSH 命令..." -ForegroundColor Yellow

# 检查多个可能的 SSH 位置
$sshPaths = @(
    "C:\Windows\System32\OpenSSH\ssh.exe",
    "C:\Program Files\OpenSSH\ssh.exe",
    "C:\Program Files (x86)\OpenSSH\ssh.exe",
    "ssh.exe"
)

$sshFound = $false

foreach ($path in $sshPaths) {
    if (Test-Path $path) {
        Write-Host "✓ 找到 SSH: $path" -ForegroundColor Green
        $sshFound = $true
        
        try {
            $version = & $path -V 2>&1
            Write-Host "  SSH 版本: $version" -ForegroundColor Cyan
        } catch {
            Write-Host "  无法获取版本信息" -ForegroundColor Red
        }
    }
}

if (-not $sshFound) {
    Write-Host "✗ 未找到 SSH 可执行文件" -ForegroundColor Red
    Write-Host ""
    Write-Host "建议操作:" -ForegroundColor Yellow
    Write-Host "1. 重启系统" -ForegroundColor White
    Write-Host "2. 重启后再次运行此脚本" -ForegroundColor White
    Write-Host "3. 如果仍有问题，请检查 OpenSSH 安装" -ForegroundColor White
} else {
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
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green 