@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "KIOSK_EXE=%PROJECT_ROOT%\kiosk.exe"

if not exist "%KIOSK_EXE%" (
  echo kiosk.exe was not found. Rebuilding it first...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build-kiosk-exe.ps1"
  if errorlevel 1 (
    echo.
    echo Failed to rebuild kiosk.exe. Shortcut was not created.
    pause
    exit /b 1
  )
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root=[IO.Path]::GetFullPath($env:PROJECT_ROOT); $exe=Join-Path $root 'kiosk.exe'; $desktop=[Environment]::GetFolderPath('Desktop'); $link=Join-Path $desktop 'Exhibition Kiosk.lnk'; $shell=New-Object -ComObject WScript.Shell; $s=$shell.CreateShortcut($link); $s.TargetPath=$exe; $s.WorkingDirectory=$root; $s.WindowStyle=7; $s.Description='Launch Exhibition Kiosk'; $icon=Join-Path $root 'assets\favicon.ico'; if(Test-Path -LiteralPath $icon){$s.IconLocation=$icon}; $s.Save(); Write-Host ('Shortcut created: ' + $link)"

if errorlevel 1 (
  echo.
  echo Failed to create the desktop shortcut.
  pause
  exit /b 1
)

echo.
echo Desktop shortcut created successfully.
pause
endlocal
