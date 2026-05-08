$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcherPath = Join-Path $projectRoot 'Launch Kiosk.cmd'
$shortcutPath = Join-Path $projectRoot 'kiosk.exe.lnk'

if (-not (Test-Path -LiteralPath $launcherPath)) {
  throw "Launcher was not found: $launcherPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Launch kiosk mode'
$shortcut.Save()

Write-Host "Shortcut updated: $shortcutPath"
