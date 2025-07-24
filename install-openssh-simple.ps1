# 简化的 OpenSSH 客户端安装指南
# 如果此脚本无法运行，请手动执行以下步骤

Write-Host "=== OpenSSH 客户端安装指南 ===" -ForegroundColor Green
Write-Host ""

Write-Host "方法一：通过 Windows 设置（推荐）" -ForegroundColor Yellow
Write-Host "1. 按 Windows + I 打开设置" -ForegroundColor White
Write-Host "2. 点击 '应用'" -ForegroundColor White
Write-Host "3. 点击 '可选功能'" -ForegroundColor White
Write-Host "4. 点击 '添加功能'" -ForegroundColor White
Write-Host "5. 搜索 'OpenSSH'" -ForegroundColor White
Write-Host "6. 勾选 'OpenSSH 客户端'" -ForegroundColor White
Write-Host "7. 点击 '安装'" -ForegroundColor White
Write-Host ""

Write-Host "方法二：通过 PowerShell（需要管理员权限）" -ForegroundColor Yellow
Write-Host "1. 按 Windows + X" -ForegroundColor White
Write-Host "2. 选择 'Windows PowerShell (管理员)'" -ForegroundColor White
Write-Host "3. 执行以下命令：" -ForegroundColor White
Write-Host "   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Cyan
Write-Host ""

Write-Host "安装完成后验证：" -ForegroundColor Yellow
Write-Host "ssh -V" -ForegroundColor Cyan
Write-Host ""

Write-Host "如果安装成功，您应该看到类似输出：" -ForegroundColor Yellow
Write-Host "OpenSSH_for_Windows_8.1p1, LibreSSL 3.0.2" -ForegroundColor Gray
Write-Host ""

Write-Host "安装完成后，运行测试脚本：" -ForegroundColor Yellow
Write-Host ".\test-cursor-remote.ps1" -ForegroundColor Cyan 