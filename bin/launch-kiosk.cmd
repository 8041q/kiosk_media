@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "KIOSK_EXE=%PROJECT_ROOT%\kiosk.exe"

rem Recovery path: if the native launcher was deleted, rebuild it first.
if not exist "%KIOSK_EXE%" (
  echo kiosk.exe was not found. Rebuilding it...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build-kiosk-exe.ps1"
  if errorlevel 1 (
    echo.
    echo Failed to rebuild kiosk.exe.
    pause
    exit /b 1
  )
  echo.
  echo kiosk.exe rebuilt successfully.
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launch-kiosk.ps1"
if errorlevel 1 (
  echo.
  echo Kiosk launch failed.
  echo Check logs\.kiosk-server.err.log and logs\.kiosk-server.out.log.
  echo.
  pause
  exit /b 1
)
endlocal
