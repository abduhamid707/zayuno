@echo off
chcp 65001 >nul
title Zayuno EVOS 24/7 Server & Tunnel
echo ============================================================
echo   🚀 ZAYUNO EVOS PROVIDER - DOIMIY FON XIZMATI (24/7)
echo ============================================================
echo Server va Cloudflare HTTPS tunnel fonda doim yoniq turadi.
echo O'chib qolsa, avtomatik ravishda o'zi qayta ishga tushadi.
echo.

cd /d "%~dp0\.."

:: 1. Start Node Server in background loop if not already on 3006
powershell -Command "if (!(Get-NetTCPConnection -LocalPort 3006 -ErrorAction SilentlyContinue)) { Start-Process cmd -ArgumentList '/c title EVOS-Node-Server & :loop & node scripts/evos-provider-server.mjs & timeout /t 3 & goto loop' -WindowStyle Hidden }"

:: 2. Start Cloudflare Tunnel if not running
powershell -Command "if (!(Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue)) { Start-Process cmd -ArgumentList '/c title EVOS-Cloudflare & :loop & .\bin\cloudflared.exe tunnel --url http://localhost:3006 & timeout /t 5 & goto loop' -WindowStyle Hidden }"

echo [OK] EVOS Server (http://localhost:3006) va Cloudflare Tunnel muvaffaqiyatli yoqildi!
echo Ushbu oynani yopishingiz mumkin, xizmatlar fonda ishlashda davom etadi.
pause
