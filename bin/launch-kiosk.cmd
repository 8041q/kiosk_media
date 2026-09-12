@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launch-kiosk.ps1"
if errorlevel 1 (
  echo.
  echo Kiosk launch failed.
  echo Check logs\.kiosk-server.err.log and logs\.kiosk-server.out.log.
  echo.
  pause
)
endlocal
