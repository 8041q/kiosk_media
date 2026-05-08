$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcherPath = Join-Path $projectRoot 'kiosk.exe'
$shortcutPath = Join-Path $projectRoot 'kiosk.exe.lnk'
$iconPath = Join-Path $projectRoot 'bin\favicon.ico'

if (-not (Test-Path -LiteralPath $launcherPath)) {
  throw "Launcher was not found: $launcherPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Launch kiosk mode'
if (Test-Path -LiteralPath $iconPath) {
  $shortcut.IconLocation = $iconPath
}
$shortcut.Save()

Write-Host "Shortcut updated: $shortcutPath"
