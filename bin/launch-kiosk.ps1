$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverScript = Join-Path $projectRoot 'server\serve-kiosk.ps1'
$serverPort = 8765
$baseUrl = "http://127.0.0.1:$serverPort"
$serverUrl = "$baseUrl/index.html"

$runtimeDir = Join-Path $projectRoot '.runtime'
$configDir = Join-Path $projectRoot 'config'
$pidFile = Join-Path $runtimeDir 'server.pid'
$browserPidFile = Join-Path $runtimeDir 'browser.pid'
$kioskProfileDir = Join-Path $runtimeDir 'firefox-profile'
$configFile = Join-Path $configDir 'kiosk-config.json'
$serverOutLog = Join-Path $projectRoot 'logs\.kiosk-server.out.log'
$serverErrLog = Join-Path $projectRoot 'logs\.kiosk-server.err.log'

$legacyServerPidFile = Join-Path $projectRoot 'bin\.kiosk-server.pid'
$legacyBrowserPidFile = Join-Path $projectRoot 'bin\.kiosk-browser.pid'
$legacyProfileDir = Join-Path $projectRoot 'bin\.firefox-kiosk-profile'
$legacyConfigFile = Join-Path $projectRoot 'bin\kiosk-config.json'

foreach ($dir in @($runtimeDir, $configDir, (Join-Path $projectRoot 'logs'))) {
  if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
  throw "Local server script was not found: $serverScript"
}

function Stop-ProcessTreeFromPidFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
  try {
    $raw = (Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue).Trim()
    if ($raw -match '^[0-9]+$') {
      & taskkill /F /T /PID ([int]$raw) 2>&1 | Out-Null
    }
  } catch {
    # Best effort cleanup only.
  } finally {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function Stop-ProcessFromPidFile {
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

function Test-KioskServerCurrent {
  try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 2
    return ($health.ok -and ([int]$health.apiVersion -ge 3))
  } catch {
    return $false
  }
}

# Close any previous kiosk Firefox instance before migrating/using its profile.
foreach ($path in @($browserPidFile, $legacyBrowserPidFile)) {
  Stop-ProcessTreeFromPidFile -Path $path
}

# Catch an orphaned kiosk Firefox process that outlived its PID file.
$escapedUrl = [Regex]::Escape($serverUrl)
Get-CimInstance Win32_Process -Filter "Name='firefox.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -match $escapedUrl } |
  ForEach-Object { & taskkill /F /T /PID $_.ProcessId 2>&1 | Out-Null }

# One-time migration from the pre-2.1 layout. The old bin/ locations were runtime
# storage by accident; config now lives in config/ and transient state in .runtime/.
if (Test-Path -LiteralPath $legacyConfigFile -PathType Leaf) {
  Copy-Item -LiteralPath $legacyConfigFile -Destination $configFile -Force
}
if (Test-Path -LiteralPath $legacyProfileDir -PathType Container) {
  if (Test-Path -LiteralPath $kioskProfileDir -PathType Container) {
    Remove-Item -LiteralPath $kioskProfileDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  Move-Item -LiteralPath $legacyProfileDir -Destination $kioskProfileDir -Force
}
if (-not (Test-Path -LiteralPath $kioskProfileDir -PathType Container)) {
  New-Item -ItemType Directory -Path $kioskProfileDir -Force | Out-Null
}

# First-run Firefox suppression preferences.
$userJsPath = Join-Path $kioskProfileDir 'user.js'
if (-not (Test-Path -LiteralPath $userJsPath -PathType Leaf)) {
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
Remove-Item -LiteralPath (Join-Path $kioskProfileDir 'parent.lock') -Force -ErrorAction SilentlyContinue

# Migrate a manually bundled FFmpeg into the single canonical tools/ location.
$preferredFfmpegDir = Join-Path $projectRoot 'tools\ffmpeg'
$legacyFfmpegDirs = @(
  (Join-Path $projectRoot 'bin\ffmpeg'),
  (Join-Path $projectRoot 'ffmpeg')
)
if (-not (Test-Path -LiteralPath $preferredFfmpegDir -PathType Container)) {
  $legacyFfmpegDir = $legacyFfmpegDirs | Where-Object { Test-Path -LiteralPath $_ -PathType Container } | Select-Object -First 1
  if ($legacyFfmpegDir) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'tools') -PathType Container)) {
      New-Item -ItemType Directory -Path (Join-Path $projectRoot 'tools') -Force | Out-Null
    }
    Move-Item -LiteralPath $legacyFfmpegDir -Destination $preferredFfmpegDir -Force
  }
}
if ((Test-Path -LiteralPath (Join-Path $preferredFfmpegDir 'bin\ffmpeg.exe') -PathType Leaf) -and
    (Test-Path -LiteralPath (Join-Path $preferredFfmpegDir 'bin\ffprobe.exe') -PathType Leaf)) {
  foreach ($legacyFfmpegDir in $legacyFfmpegDirs) {
    if (Test-Path -LiteralPath $legacyFfmpegDir -PathType Container) {
      Remove-Item -LiteralPath $legacyFfmpegDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

$serverRunning = Test-KioskServerCurrent
if (-not $serverRunning) {
  # If a previous launcher lost its PID file, recycle only PowerShell processes
  # that are clearly serving this kiosk root. This avoids a stale listener on 8765.
  $rootPattern = [Regex]::Escape($projectRoot)
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match 'serve-kiosk\.ps1' -and
      $_.CommandLine -match $rootPattern
    } |
    ForEach-Object { Stop-Process -Id ([int]$_.ProcessId) -Force -ErrorAction SilentlyContinue }

  foreach ($path in @($pidFile, $legacyServerPidFile)) {
    Stop-ProcessFromPidFile -Path $path
  }
  Remove-Item -LiteralPath $serverOutLog -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $serverErrLog -Force -ErrorAction SilentlyContinue

  $serverArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"{0}"' -f $serverScript),
    '-RootPath', ('"{0}"' -f $projectRoot),
    '-Port', $serverPort
  )
  $serverProc = Start-Process -FilePath 'powershell.exe' -WorkingDirectory $projectRoot -ArgumentList ($serverArgs -join ' ') -WindowStyle Hidden -PassThru -RedirectStandardOutput $serverOutLog -RedirectStandardError $serverErrLog
  Set-Content -LiteralPath $pidFile -Value $serverProc.Id -Encoding ASCII

  $serverReady = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 125
    if ($serverProc.HasExited) {
      $stderr = if (Test-Path -LiteralPath $serverErrLog) { Get-Content -LiteralPath $serverErrLog -Raw } else { '' }
      $stdout = if (Test-Path -LiteralPath $serverOutLog) { Get-Content -LiteralPath $serverOutLog -Raw } else { '' }
      throw "Kiosk server exited during startup.`nSTDERR:`n$stderr`nSTDOUT:`n$stdout"
    }
    if (Test-KioskServerCurrent) { $serverReady = $true; break }
  }
  if (-not $serverReady) {
    throw "Kiosk server did not become ready at $serverUrl. Check logs\.kiosk-server.err.log"
  }
}

# Remove source/runtime artifacts that v2.1 no longer uses. These names are all
# generated or superseded project files; media content itself is never touched.
$obsoleteFiles = @(
  'bin\serve-kiosk.ps1',
  'bin\generate-media-manifest.ps1',
  'bin\ffmpeg-wrapper.ps1',
  'bin\favicon.ico',
  'bin\favicon.jpg',
  'media\manifest.js',
  'media\video-fix-report.json',
  'src\admin.js',
  'src\catalog.js',
  'src\config.js',
  'src\i18n.js',
  'src\language.js',
  'src\logo.js',
  'src\main-screen.js',
  'src\osk.js',
  'src\persistence.js',
  'src\player.js',
  'src\screen-router.js',
  'src\state.js',
  'src\theme.js',
  'src\ui.js'
)
foreach ($relative in $obsoleteFiles) {
  Remove-Item -LiteralPath (Join-Path $projectRoot $relative) -Force -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $legacyConfigFile -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $legacyServerPidFile -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $legacyBrowserPidFile -Force -ErrorAction SilentlyContinue

function Resolve-FirefoxPath {
  $candidatePaths = @()
  if ($env:ProgramFiles) { $candidatePaths += (Join-Path $env:ProgramFiles 'Mozilla Firefox\firefox.exe') }
  if (${env:ProgramFiles(x86)}) { $candidatePaths += (Join-Path ${env:ProgramFiles(x86)} 'Mozilla Firefox\firefox.exe') }
  if ($env:LocalAppData) { $candidatePaths += (Join-Path $env:LocalAppData 'Mozilla Firefox\firefox.exe') }

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

$browserArgs = @('-new-instance', '-no-remote', '-profile', ('"{0}"' -f $kioskProfileDir), '-kiosk', ('"{0}"' -f $serverUrl))
$browserProc = Start-Process -FilePath $firefoxPath -WorkingDirectory $projectRoot -ArgumentList ($browserArgs -join ' ') -PassThru

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
