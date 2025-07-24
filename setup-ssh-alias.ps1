# 设置 SSH 别名脚本
# 使用 Git 中的 SSH 作为临时解决方案

Write-Host "=== 设置 SSH 别名 ===" -ForegroundColor Green
Write-Host ""

# 检查 Git SSH 是否可用
$gitSshPath = "C:\Program Files\Git\usr\bin\ssh.exe"
if (Test-Path $gitSshPath) {
    Write-Host "✓ 找到 Git SSH: $gitSshPath" -ForegroundColor Green
    
    # 创建 SSH 别名
    Write-Host "正在创建 SSH 别名..." -ForegroundColor Yellow
    
    # 方法1：创建函数别名
    $sshFunction = @"
function ssh {
    & "$gitSshPath" `$args
}
"@
    
    # 添加到 PowerShell 配置文件
    $profilePath = $PROFILE
    if (!(Test-Path $profilePath)) {
        New-Item -ItemType File -Path $profilePath -Force | Out-Null
        Write-Host "创建了 PowerShell 配置文件: $profilePath" -ForegroundColor Cyan
    }
    
    # 检查是否已经存在 SSH 函数
    $profileContent = Get-Content $profilePath -ErrorAction SilentlyContinue
    if ($profileContent -notcontains "function ssh {") {
        Add-Content -Path $profilePath -Value $sshFunction
        Write-Host "✓ SSH 别名已添加到 PowerShell 配置文件" -ForegroundColor Green
    } else {
        Write-Host "✓ SSH 别名已存在" -ForegroundColor Green
    }
    
    # 重新加载配置文件
    . $profilePath
    
    Write-Host ""
    Write-Host "测试 SSH 功能..." -ForegroundColor Yellow
    try {
        $version = ssh -V 2>&1
        Write-Host "✓ SSH 测试成功: $version" -ForegroundColor Green
    } catch {
        Write-Host "✗ SSH 测试失败: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} else {
    Write-Host "✗ 未找到 Git SSH" -ForegroundColor Red
    Write-Host "请确保已安装 Git for Windows" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 设置完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "现在您可以:" -ForegroundColor Yellow
Write-Host "1. 运行测试脚本: .\test-cursor-remote.ps1" -ForegroundColor White
Write-Host "2. 在 Cursor 中使用 Remote-SSH" -ForegroundColor White
Write-Host "3. 重新打开 PowerShell 以应用更改" -ForegroundColor White 