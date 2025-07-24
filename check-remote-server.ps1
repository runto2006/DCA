# 检查远程服务器环境脚本
# 为 Cursor Server 安装做准备

Write-Host "=== 远程服务器环境检查 ===" -ForegroundColor Green
Write-Host ""

Write-Host "正在连接到远程服务器..." -ForegroundColor Yellow

# 检查基本系统信息
Write-Host "1. 系统信息:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "uname -a && cat /etc/os-release | grep PRETTY_NAME"

Write-Host ""

# 检查网络连接
Write-Host "2. 网络连接测试:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "ping -c 3 google.com"

Write-Host ""

# 检查必要工具
Write-Host "3. 检查必要工具:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "which curl && which wget && which bash"

Write-Host ""

# 检查磁盘空间
Write-Host "4. 磁盘空间:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "df -h /"

Write-Host ""

# 检查内存
Write-Host "5. 内存使用:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "free -h"

Write-Host ""

# 检查用户权限
Write-Host "6. 用户权限:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "id && groups"

Write-Host ""

# 检查 sudo 权限
Write-Host "7. Sudo 权限:" -ForegroundColor Cyan
ssh ubuntu@43.163.241.83 "sudo -l"

Write-Host ""

Write-Host "=== 检查完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "如果所有检查都通过，您可以在 Cursor 中使用 Remote-SSH 连接" -ForegroundColor Yellow 