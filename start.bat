@@ -0,0 +1,12 @@
@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo サーバーを起動しています...
echo.
start "AIたなかたかし Server" cmd /k "python -m http.server 8000"
echo 3秒後にブラウザを開きます...
timeout /t 3 /nobreak >nul
start http://localhost:8000
echo.
echo ブラウザで http://localhost:8000 が開きました。
echo サーバーを止める場合は [AIたなかたかし Server] の窓で Ctrl+C を押してください。
pause
