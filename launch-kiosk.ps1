$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestScript = Join-Path $projectRoot 'generate-media-manifest.ps1'
& $manifestScript

$firefoxPath = 'C:\Program Files\Mozilla Firefox\firefox.exe'
if (-not (Test-Path $firefoxPath)) {
  $firefoxCmd = Get-Command firefox.exe -ErrorAction SilentlyContinue
  if ($firefoxCmd) {
    $firefoxPath = $firefoxCmd.Source
  }
}

if (-not (Test-Path $firefoxPath)) {
  throw 'Firefox executable was not found.'
}

$indexPath = Join-Path $projectRoot 'index.html'
Start-Process -FilePath $firefoxPath -WorkingDirectory $projectRoot -ArgumentList @('-kiosk', $indexPath)
