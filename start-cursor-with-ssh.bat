@echo off
REM 启动 Cursor 并设置 SSH 路径
echo 正在启动 Cursor with SSH support...

REM 设置 PATH 环境变量
set PATH=C:\Program Files\Git\usr\bin;%PATH%

REM 启动 Cursor
start "" "C:\Users\wingo\AppData\Local\Programs\cursor\Cursor.exe"

echo Cursor 已启动，现在可以尝试 Remote-SSH 连接
pause 