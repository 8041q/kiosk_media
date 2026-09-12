$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverScript = Join-Path $projectRoot 'bin\serve-kiosk.ps1'
$serverPort = 8765
$baseUrl = "http://127.0.0.1:$serverPort"
$serverUrl = "$baseUrl/index.html"
$pidFile = Join-Path $projectRoot 'bin\.kiosk-server.pid'
$browserPidFile = Join-Path $projectRoot 'bin\.kiosk-browser.pid'
$kioskProfileDir = Join-Path $projectRoot 'bin\.firefox-kiosk-profile'
$serverOutLog = Join-Path $projectRoot 'logs\.kiosk-server.out.log'
$serverErrLog = Join-Path $projectRoot 'logs\.kiosk-server.err.log'

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'logs'))) {
  New-Item -ItemType Directory -Path (Join-Path $projectRoot 'logs') -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $kioskProfileDir -PathType Container)) {
  New-Item -ItemType Directory -Path $kioskProfileDir -Force | Out-Null
}

# Preserve the original kiosk Firefox profile location and preferences.
$userJsPath = Join-Path $kioskProfileDir 'user.js'
if (-not (Test-Path -LiteralPath $userJsPath)) {
  $userJs = @'
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("browser.startup.firstrunSkipsHomepage", true);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("trailhead.firstrun.didSeeAboutWelcome", true);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
'@
  Set-Content -LiteralPath $userJsPath -Value $userJs -Encoding ASCII
}

if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
  throw "Local server script was not found: $serverScript"
}

function Test-KioskServerV2 {
  try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 2
    return ($health.ok -and ([int]$health.version -ge 2))
  } catch {
    return $false
  }
}

function Stop-PidFileProcess {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
  try {
    $raw = (Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue).Trim()
    if ($raw -match '^[0-9]+$') {
      Stop-Process -Id ([int]$raw) -Force -ErrorAction SilentlyContinue
    }
  } finally {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

$serverRunning = Test-KioskServerV2
if (-not $serverRunning) {
  Stop-PidFileProcess -Path $pidFile
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

  $serverReady = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 125
    if ($serverProc.HasExited) {
      $stderr = if (Test-Path -LiteralPath $serverErrLog) { Get-Content -LiteralPath $serverErrLog -Raw } else { '' }
      $stdout = if (Test-Path -LiteralPath $serverOutLog) { Get-Content -LiteralPath $serverOutLog -Raw } else { '' }
      throw "Kiosk server exited during startup.`nSTDERR:`n$stderr`nSTDOUT:`n$stdout"
    }
    if (Test-KioskServerV2) { $serverReady = $true; break }
  }

  if (-not $serverReady) {
    throw "Kiosk server did not become ready at $serverUrl. Check logs\.kiosk-server.err.log"
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
      if ($defaultValue) { $candidatePaths += $defaultValue }
    } catch {}
  }

  $firefoxCmd = Get-Command firefox.exe -ErrorAction SilentlyContinue
  if ($firefoxCmd -and $firefoxCmd.Source) { $candidatePaths += $firefoxCmd.Source }

  foreach ($candidate in ($candidatePaths | Select-Object -Unique)) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
  }
  return $null
}

$firefoxPath = Resolve-FirefoxPath
if (-not $firefoxPath) {
  throw 'Firefox executable was not found. Install Mozilla Firefox, or add firefox.exe to PATH.'
}

# Kill only the Firefox process previously launched by this kiosk.
if (Test-Path -LiteralPath $browserPidFile -PathType Leaf) {
  $stalePid = (Get-Content -LiteralPath $browserPidFile -Raw -ErrorAction SilentlyContinue).Trim()
  if ($stalePid -match '^[0-9]+$') {
    & taskkill /F /T /PID ([int]$stalePid) 2>&1 | Out-Null
  }
}

# Also catch an orphaned kiosk Firefox instance using this URL.
$escapedUrl = [Regex]::Escape($serverUrl)
Get-CimInstance Win32_Process -Filter "Name='firefox.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -match $escapedUrl } |
  ForEach-Object { & taskkill /F /T /PID $_.ProcessId 2>&1 | Out-Null }

Remove-Item -LiteralPath $browserPidFile -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $kioskProfileDir 'parent.lock') -Force -ErrorAction SilentlyContinue

$browserProc = Start-Process -FilePath $firefoxPath -WorkingDirectory $projectRoot -ArgumentList @(
  '-new-instance', '-no-remote', '-profile', $kioskProfileDir, '-kiosk', $serverUrl
) -PassThru

Start-Sleep -Milliseconds 700
$resolvedBrowserPid = $null
$kioskProc = Get-CimInstance Win32_Process -Filter "Name='firefox.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -match [Regex]::Escape($serverUrl) } |
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
