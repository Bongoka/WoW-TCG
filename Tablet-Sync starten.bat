@echo off
rem WLAN-Abgleich fuer die Tablet-App: Fenster offen lassen, dann auf dem Tablet die App WoW TCG starten.
cd /d "%~dp0"
for /d %%J in ("G:\downloads\android-build\jdk\*") do set "JAVA=%%J\bin\java.exe"
"%JAVA%" bin\SyncServer.java "%CD%" 8766
pause
