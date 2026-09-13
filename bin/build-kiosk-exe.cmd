@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build-kiosk-exe.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo EXE build failed. See the error above.
) else (
  echo EXE build completed successfully.
)
pause
exit /b %EXIT_CODE%
