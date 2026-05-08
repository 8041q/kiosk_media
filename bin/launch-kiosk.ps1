$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$manifestScript = Join-Path $projectRoot 'bin\generate-media-manifest.ps1'
& $manifestScript

$serverScript = Join-Path $projectRoot 'bin\serve-kiosk.ps1'
$serverPort = 8765
$serverUrl = "http://127.0.0.1:$serverPort/index.html"
$pidFile = Join-Path $projectRoot 'bin\.kiosk-server.pid'
$browserPidFile = Join-Path $projectRoot 'bin\.kiosk-browser.pid'
$serverOutLog = Join-Path $projectRoot 'logs\.kiosk-server.out.log'
$serverErrLog = Join-Path $projectRoot 'logs\.kiosk-server.err.log'

if (-not (Test-Path -LiteralPath $serverScript)) {
  throw "Local server script was not found: $serverScript"
}

function Test-ServerSupportsApi {
  param(
    [string]$BaseUrl,
    [string]$ApiPath
  )

  try {
    Invoke-WebRequest -Uri "$BaseUrl$ApiPath" -Method Post -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

$serverRunning = $false
if (Test-Path -LiteralPath $pidFile) {
  $existingPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
  if ($existingPid -match '^[0-9]+$') {
    $proc = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($proc) {
      $serverRunning = $true

      $baseUrl = "http://127.0.0.1:$serverPort"
      $supportsScanApi = Test-ServerSupportsApi -BaseUrl $baseUrl -ApiPath '/api/scan'
      $supportsExitApi = Test-ServerSupportsApi -BaseUrl $baseUrl -ApiPath '/api/exit'

      # Recycle stale server builds that do not expose current runtime APIs.
      if (-not ($supportsScanApi -and $supportsExitApi)) {
        try {
          Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        } catch {
          # Continue; startup below will fail loudly if this process is still binding the port.
        }

        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        $serverRunning = $false
      }
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

  function Resolve-FirefoxPath {
    $candidatePaths = @()

    if ($env:ProgramFiles) {
      $candidatePaths += (Join-Path $env:ProgramFiles 'Mozilla Firefox\firefox.exe')
    }

    if (${env:ProgramFiles(x86)}) {
      $candidatePaths += (Join-Path ${env:ProgramFiles(x86)} 'Mozilla Firefox\firefox.exe')
    }

    if ($env:LocalAppData) {
      $candidatePaths += (Join-Path $env:LocalAppData 'Mozilla Firefox\firefox.exe')
    }

    foreach ($registryPath in @(
      'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe',
      'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe',
      'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe'
    )) {
      try {
        $defaultValue = (Get-ItemProperty -Path $registryPath -ErrorAction Stop).'(default)'
        if ($defaultValue) {
          $candidatePaths += $defaultValue
        }
      } catch {
        # Ignore missing registry keys.
      }
    }

    $firefoxCmd = Get-Command firefox.exe -ErrorAction SilentlyContinue
    if ($firefoxCmd -and $firefoxCmd.Source) {
      $candidatePaths += $firefoxCmd.Source
    }

    foreach ($candidate in ($candidatePaths | Select-Object -Unique)) {
      if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        return $candidate
      }
    }

    return $null
  }

  $firefoxPath = Resolve-FirefoxPath
  if (-not $firefoxPath) {
    throw "Firefox executable was not found. Install Mozilla Firefox, or add firefox.exe to PATH, then re-run launch-kiosk.cmd."
  }

  Remove-Item -LiteralPath $browserPidFile -Force -ErrorAction SilentlyContinue

  $launchStartedAt = Get-Date
  $browserProc = Start-Process -FilePath $firefoxPath -WorkingDirectory $projectRoot -ArgumentList @('-new-instance', '-kiosk', $serverUrl) -PassThru

  Start-Sleep -Milliseconds 700
  $resolvedBrowserPid = $null

  $kioskProc = Get-CimInstance Win32_Process -Filter "Name='firefox.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match [Regex]::Escape($serverUrl)
    } |
    Sort-Object CreationDate -Descending |
    Select-Object -First 1

  if ($kioskProc) {
    $resolvedBrowserPid = [int]$kioskProc.ProcessId
  } elseif ($browserProc -and -not $browserProc.HasExited) {
    $resolvedBrowserPid = [int]$browserProc.Id
  }

  if ($null -ne $resolvedBrowserPid) {
    Set-Content -LiteralPath $browserPidFile -Value $resolvedBrowserPid -Encoding ASCII
  }
