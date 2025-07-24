# 使用 DISM 安装 OpenSSH 脚本

Write-Host "=== 使用 DISM 安装 OpenSSH ===" -ForegroundColor Green
Write-Host ""

Write-Host "方法 1: 使用 DISM 安装 OpenSSH 客户端..." -ForegroundColor Yellow

try {
    # 使用 DISM 安装 OpenSSH 客户端
    $result = DISM /Online /Add-Capability /CapabilityName:OpenSSH.Client~~~~0.0.1.0
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ DISM 安装成功" -ForegroundColor Green
    } else {
        Write-Host "✗ DISM 安装失败" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ DISM 安装异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "方法 2: 检查 OpenSSH 是否已安装..." -ForegroundColor Yellow

try {
    $installed = Get-WindowsCapability -Online | Where-Object {$_.Name -like "OpenSSH.Client*" -and $_.State -eq "Installed"}
    
    if ($installed) {
        Write-Host "✓ OpenSSH 客户端已安装: $($installed.Name)" -ForegroundColor Green
    } else {
        Write-Host "✗ OpenSSH 客户端未安装" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "如果安装成功，请重启系统后测试 SSH 命令" -ForegroundColor Yellow 