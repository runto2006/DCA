# 检查可用的 OpenSSH 包脚本

Write-Host "=== 检查可用的 OpenSSH 包 ===" -ForegroundColor Green
Write-Host ""

Write-Host "正在检查可用的 OpenSSH 包..." -ForegroundColor Yellow

try {
    # 获取所有可用的 OpenSSH 包
    $packages = Get-WindowsCapability -Online | Where-Object {$_.Name -like "*OpenSSH*"}
    
    if ($packages) {
        Write-Host "找到以下 OpenSSH 包:" -ForegroundColor Green
        $packages | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Cyan
            Write-Host "    状态: $($_.State)" -ForegroundColor Gray
            Write-Host "    描述: $($_.Description)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "未找到任何 OpenSSH 包" -ForegroundColor Red
    }
} catch {
    Write-Host "检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 检查完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "如果找到可用的包，请尝试安装:" -ForegroundColor Yellow
Write-Host "Add-WindowsCapability -Online -Name <包名>" -ForegroundColor White 