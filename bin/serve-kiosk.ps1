param(
  [string]$RootPath,
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'

if (-not $RootPath) {
  $RootPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

$resolvedRoot = (Resolve-Path -LiteralPath $RootPath).Path
$prefix = "http://127.0.0.1:$Port/"
$manifestScriptPath = Join-Path $resolvedRoot 'bin\generate-media-manifest.ps1'
$browserPidFilePath = Join-Path $resolvedRoot 'bin\.kiosk-browser.pid'

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.mp4'  = 'video/mp4'
  '.webm' = 'video/webm'
  '.mov'  = 'video/quicktime'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

function Send-HttpResponse {
  param(
    [Parameter(Mandatory = $true)]
    $Context,
    [Parameter(Mandatory = $true)]
    [int]$StatusCode,
    [Parameter(Mandatory = $true)]
    [string]$ContentType,
    [byte[]]$Bytes = @()
  )

  try {
    $Context.Response.StatusCode = $StatusCode
    $Context.Response.ContentType = $ContentType
    $Context.Response.ContentLength64 = $Bytes.Length

    if ($Context.Request.HttpMethod -ne 'HEAD' -and $Bytes.Length -gt 0) {
      $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    }
  } catch {
    # Swallow per-request write failures so the listener can continue serving.
  } finally {
    try { $Context.Response.OutputStream.Close() } catch {}
  }
}

function Send-JsonResponse {
  param(
    [Parameter(Mandatory = $true)]
    $Context,
    [Parameter(Mandatory = $true)]
    [int]$StatusCode,
    [Parameter(Mandatory = $true)]
    [object]$Payload
  )

  $json = $Payload | ConvertTo-Json -Depth 6
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  Send-HttpResponse -Context $Context -StatusCode $StatusCode -ContentType 'application/json; charset=utf-8' -Bytes $bytes
}

function Handle-ScanRequest {
  param(
    [Parameter(Mandatory = $true)]
    $Context
  )

  if (-not (Test-Path -LiteralPath $manifestScriptPath -PathType Leaf)) {
    Send-JsonResponse -Context $Context -StatusCode 500 -Payload @{
      ok = $false
      error = 'Manifest generation script not found.'
    }
    return
  }

  try {
    & $manifestScriptPath | Out-Null
    Send-JsonResponse -Context $Context -StatusCode 200 -Payload @{
      ok = $true
      manifest = 'media/manifest.js'
      refreshedAt = [DateTime]::UtcNow.ToString('o')
    }
  } catch {
    Send-JsonResponse -Context $Context -StatusCode 500 -Payload @{
      ok = $false
      error = $_.Exception.Message
    }
  }
}

function Get-PidFromFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PidFilePath
  )

  if (-not (Test-Path -LiteralPath $PidFilePath -PathType Leaf)) {
    return $null
  }

  $rawPid = (Get-Content -LiteralPath $PidFilePath -Raw -ErrorAction SilentlyContinue).Trim()
  if (-not ($rawPid -match '^[0-9]+$')) {
    Remove-Item -LiteralPath $PidFilePath -Force -ErrorAction SilentlyContinue
    return $null
  }

  return [int]$rawPid
}

function Start-DetachedShutdownWorker {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ServerPid,
    [Parameter(Mandatory = $true)]
    [string]$BrowserPidFilePath,
    [Parameter(Mandatory = $true)]
    [string]$KioskUrl,
    [int]$DelayMs = 1400
  )

  $workerScriptPath = Join-Path $env:TEMP ("kiosk-shutdown-{0}.ps1" -f [Guid]::NewGuid().ToString('N'))
  $workerScript = @'
param(
  [int]$ServerPid,
  [string]$BrowserPidFilePath,
  [string]$KioskUrl,
  [int]$DelayMs,
  [string]$SelfScriptPath
)

Start-Sleep -Milliseconds $DelayMs

function Stop-ByPid {
  param([int]$PidToStop)
  try {
    Stop-Process -Id $PidToStop -Force -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

$stoppedAnyBrowser = $false

try {
  if (Test-Path -LiteralPath $BrowserPidFilePath -PathType Leaf) {
    $rawPid = (Get-Content -LiteralPath $BrowserPidFilePath -Raw -ErrorAction SilentlyContinue).Trim()
    if ($rawPid -match '^[0-9]+$') {
      if (Stop-ByPid -PidToStop ([int]$rawPid)) {
        $stoppedAnyBrowser = $true
      }
    }
    Remove-Item -LiteralPath $BrowserPidFilePath -Force -ErrorAction SilentlyContinue
  }

  if (-not $stoppedAnyBrowser) {
    $escapedUrl = [Regex]::Escape($KioskUrl)
    $kioskProcesses = Get-CimInstance Win32_Process -Filter "Name='firefox.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine -match $escapedUrl }

    foreach ($proc in $kioskProcesses) {
      if (Stop-ByPid -PidToStop ([int]$proc.ProcessId)) {
        $stoppedAnyBrowser = $true
      }
    }
  }

  Stop-Process -Id $ServerPid -Force -ErrorAction SilentlyContinue
} finally {
  Remove-Item -LiteralPath $SelfScriptPath -Force -ErrorAction SilentlyContinue
}
'@

  Set-Content -LiteralPath $workerScriptPath -Value $workerScript -Encoding ASCII
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $workerScriptPath,
    '-ServerPid', $ServerPid,
    '-BrowserPidFilePath', $BrowserPidFilePath,
    '-KioskUrl', $KioskUrl,
    '-DelayMs', $DelayMs,
    '-SelfScriptPath', $workerScriptPath
  ) | Out-Null
}

function Handle-ExitRequest {
  param(
    [Parameter(Mandatory = $true)]
    $Context
  )

  $browserPid = Get-PidFromFile -PidFilePath $browserPidFilePath

  Send-JsonResponse -Context $Context -StatusCode 200 -Payload @{
    ok = $true
    browserPid = $browserPid
    shuttingDown = $true
    stoppedAt = [DateTime]::UtcNow.ToString('o')
  }

  Start-DetachedShutdownWorker -ServerPid $PID -BrowserPidFilePath $browserPidFilePath -KioskUrl "http://127.0.0.1:$Port/index.html"
}

try {
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
    } catch {
      break
    }

    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))

    if ($requestPath -eq 'api/scan') {
      if ($context.Request.HttpMethod -eq 'POST') {
        Handle-ScanRequest -Context $context
      } else {
        Send-JsonResponse -Context $context -StatusCode 405 -Payload @{
          ok = $false
          error = 'Method Not Allowed'
        }
      }
      continue
    }

    if ($requestPath -eq 'api/exit') {
      if ($context.Request.HttpMethod -eq 'POST') {
        Handle-ExitRequest -Context $context
      } else {
        Send-JsonResponse -Context $context -StatusCode 405 -Payload @{
          ok = $false
          error = 'Method Not Allowed'
        }
      }
      continue
    }

    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = 'index.html'
    }

    $candidatePath = Join-Path $resolvedRoot ($requestPath -replace '/', '\\')
    $fullPath = [System.IO.Path]::GetFullPath($candidatePath)

    if (-not $fullPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
      Send-HttpResponse -Context $context -StatusCode 403 -ContentType 'text/plain; charset=utf-8' -Bytes $bytes
      continue
    }

    if (Test-Path -LiteralPath $fullPath -PathType Container) {
      $fullPath = Join-Path $fullPath 'index.html'
    }

    if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
      try {
        $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        Send-HttpResponse -Context $context -StatusCode 200 -ContentType $contentType -Bytes $bytes
      } catch {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Internal Server Error')
        Send-HttpResponse -Context $context -StatusCode 500 -ContentType 'text/plain; charset=utf-8' -Bytes $bytes
      }
      continue
    }

    $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
    Send-HttpResponse -Context $context -StatusCode 404 -ContentType 'text/plain; charset=utf-8' -Bytes $bytes
  }
}
finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
