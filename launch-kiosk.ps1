$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestScript = Join-Path $projectRoot 'generate-media-manifest.ps1'
& $manifestScript

$serverScript = Join-Path $projectRoot 'serve-kiosk.ps1'
$serverPort = 8765
$serverUrl = "http://127.0.0.1:$serverPort/index.html"
$pidFile = Join-Path $projectRoot '.kiosk-server.pid'
$serverOutLog = Join-Path $projectRoot '.kiosk-server.out.log'
$serverErrLog = Join-Path $projectRoot '.kiosk-server.err.log'

if (-not (Test-Path -LiteralPath $serverScript)) {
  throw "Local server script was not found: $serverScript"
}

$serverRunning = $false
if (Test-Path -LiteralPath $pidFile) {
  $existingPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
  if ($existingPid -match '^[0-9]+$') {
    $proc = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($proc) {
      $serverRunning = $true
    } else {
      Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }
  } else {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  }
}

if (-not $serverRunning) {
  Remove-Item -LiteralPath $serverOutLog -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $serverErrLog -Force -ErrorAction SilentlyContinue

  $serverProc = Start-Process -FilePath 'powershell.exe' -WorkingDirectory $projectRoot -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $serverScript,
    '-RootPath', $projectRoot,
    '-Port', $serverPort
  ) -WindowStyle Hidden -PassThru -RedirectStandardOutput $serverOutLog -RedirectStandardError $serverErrLog

  Set-Content -LiteralPath $pidFile -Value $serverProc.Id -Encoding ASCII

  Start-Sleep -Milliseconds 120
  if ($serverProc.HasExited) {
    $stderr = if (Test-Path -LiteralPath $serverErrLog) { Get-Content -LiteralPath $serverErrLog -Raw } else { '' }
    $stdout = if (Test-Path -LiteralPath $serverOutLog) { Get-Content -LiteralPath $serverOutLog -Raw } else { '' }
    throw "Kiosk server exited during startup.`nSTDERR:`n$stderr`nSTDOUT:`n$stdout"
  }

  $serverReady = $false
  for ($i = 0; $i -lt 25; $i++) {
    try {
      Invoke-WebRequest -Uri $serverUrl -Method Head -UseBasicParsing -TimeoutSec 1 | Out-Null
      $serverReady = $true
      break
    } catch {
      if ($serverProc.HasExited) {
        $stderr = if (Test-Path -LiteralPath $serverErrLog) { Get-Content -LiteralPath $serverErrLog -Raw } else { '' }
        $stdout = if (Test-Path -LiteralPath $serverOutLog) { Get-Content -LiteralPath $serverOutLog -Raw } else { '' }
        throw "Kiosk server exited during readiness check.`nSTDERR:`n$stderr`nSTDOUT:`n$stdout"
      }
      Start-Sleep -Milliseconds 120
    }
  }

  if (-not $serverReady) {
    throw "Kiosk server did not become ready at $serverUrl"
  }
}

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

Start-Process -FilePath $firefoxPath -WorkingDirectory $projectRoot -ArgumentList @('-kiosk', $serverUrl)
