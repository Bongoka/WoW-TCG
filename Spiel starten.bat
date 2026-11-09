@echo off
rem Startet das Spiel ueber einen kleinen lokalen Webserver (.claude\serve.ps1) statt als Datei (file://).
rem Nur so erlaubt der Browser Web Worker: Simulation auf allen Kernen, CPU-Gegner rechnet im Hintergrund.
cd /d "%~dp0"
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('localhost', 8765)).Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
    start "WoW TCG Server" /min powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\serve.ps1" -Port 8765
    timeout /t 2 /nobreak >nul
)
start "" http://localhost:8765/
