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
$configFilePath     = Join-Path $resolvedRoot 'bin\kiosk-config.json'
$githubUrl = 'https://github.com/8041q/kiosk_media'
$issuesUrl = 'https://github.com/8041q/kiosk_media/issues'

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

# ── Logging ──────────────────────────────────────────────────────────────────
# Write-Log goes to stdout  → captured in .kiosk-server.out.log
# Write-Err goes to stderr  → captured in .kiosk-server.err.log
function Write-Log {
  param([string]$Message)
  $ts = (Get-Date).ToString('HH:mm:ss.fff')
  [Console]::Out.WriteLine("[$ts] $Message")
  [Console]::Out.Flush()
}
function Write-Err {
  param([string]$Message)
  $ts = (Get-Date).ToString('HH:mm:ss.fff')
  [Console]::Error.WriteLine("[$ts] ERROR $Message")
  [Console]::Error.Flush()
}

Write-Log "=== Kiosk server starting on $prefix ==="
Write-Log "Root: $resolvedRoot"

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

function Stop-ProcessTree {
  param([int]$PidToStop)
  $result = & taskkill /F /T /PID $PidToStop 2>&1
  return ($LASTEXITCODE -eq 0)
}

$stoppedAnyBrowser = $false

try {
  if (Test-Path -LiteralPath $BrowserPidFilePath -PathType Leaf) {
    $rawPid = (Get-Content -LiteralPath $BrowserPidFilePath -Raw -ErrorAction SilentlyContinue).Trim()
    if ($rawPid -match '^[0-9]+$') {
      if (Stop-ProcessTree -PidToStop ([int]$rawPid)) {
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
      if (Stop-ProcessTree -PidToStop ([int]$proc.ProcessId)) {
        $stoppedAnyBrowser = $true
      }
    }
  }

  & taskkill /F /T /PID $ServerPid 2>&1 | Out-Null
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

function Handle-ConfigGetRequest {
  param(
    [Parameter(Mandatory = $true)]
    $Context
  )

  if (Test-Path -LiteralPath $configFilePath -PathType Leaf) {
    try {
      $json = Get-Content -LiteralPath $configFilePath -Raw -Encoding UTF8
      # Validate it is parseable before sending
      $null = $json | ConvertFrom-Json
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
      Send-HttpResponse -Context $Context -StatusCode 200 -ContentType 'application/json; charset=utf-8' -Bytes $bytes
    } catch {
      Send-JsonResponse -Context $Context -StatusCode 500 -Payload @{ ok = $false; error = $_.Exception.Message }
    }
  } else {
    # No config yet — return empty object so the app uses its defaults
    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{}')
    Send-HttpResponse -Context $Context -StatusCode 200 -ContentType 'application/json; charset=utf-8' -Bytes $bytes
  }
}

function Handle-ConfigSaveRequest {
  param(
    [Parameter(Mandatory = $true)]
    $Context
  )

  try {
    $reader = New-Object System.IO.StreamReader($Context.Request.InputStream, [System.Text.Encoding]::UTF8)
    $body   = $reader.ReadToEnd()
    $reader.Close()

    # Validate JSON before writing
    $null = $body | ConvertFrom-Json

    # Ensure parent directory exists
    $dir = Split-Path -Parent $configFilePath
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
      New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    [System.IO.File]::WriteAllText($configFilePath, $body, [System.Text.Encoding]::UTF8)

    Send-JsonResponse -Context $Context -StatusCode 200 -Payload @{ ok = $true }
  } catch {
    Send-JsonResponse -Context $Context -StatusCode 400 -Payload @{ ok = $false; error = $_.Exception.Message }
  }
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

function Handle-OpenExternalRequest {
  param(
    [Parameter(Mandatory = $true)]
    $Context,
    [Parameter(Mandatory = $true)]
    [string]$Target
  )

  $targetUrl = switch ($Target) {
    'github' { $githubUrl }
    'issues' { $issuesUrl }
    default { $null }
  }

  if (-not $targetUrl) {
    Send-JsonResponse -Context $Context -StatusCode 404 -Payload @{
      ok = $false
      error = 'Unknown external target.'
    }
    return
  }

  try {
    Start-Process $targetUrl | Out-Null
    Send-JsonResponse -Context $Context -StatusCode 200 -Payload @{
      ok = $true
      target = $Target
      url = $targetUrl
      openedAt = [DateTime]::UtcNow.ToString('o')
    }
  } catch {
    Send-JsonResponse -Context $Context -StatusCode 500 -Payload @{
      ok = $false
      error = $_.Exception.Message
      target = $Target
    }
  }
}

try {
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
    } catch {
      break
    }

    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    $reqMethod   = $context.Request.HttpMethod
    $rangeHdr    = $context.Request.Headers['Range']
    $rangeLog    = if ($rangeHdr) { " Range=[$rangeHdr]" } else { '' }
    Write-Log ">> $reqMethod /$requestPath$rangeLog"

    if ($requestPath -eq 'api/config') {
      if ($context.Request.HttpMethod -eq 'GET') {
        Handle-ConfigGetRequest -Context $context
      } elseif ($context.Request.HttpMethod -eq 'POST') {
        Handle-ConfigSaveRequest -Context $context
      } else {
        Send-JsonResponse -Context $context -StatusCode 405 -Payload @{
          ok = $false
          error = 'Method Not Allowed'
        }
      }
      continue
    }

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

    if ($requestPath -eq 'api/open-github') {
      if ($context.Request.HttpMethod -eq 'POST') {
        Handle-OpenExternalRequest -Context $context -Target 'github'
      } else {
        Send-JsonResponse -Context $context -StatusCode 405 -Payload @{
          ok = $false
          error = 'Method Not Allowed'
        }
      }
      continue
    }

    if ($requestPath -eq 'api/open-issues') {
      if ($context.Request.HttpMethod -eq 'POST') {
        Handle-OpenExternalRequest -Context $context -Target 'issues'
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
        $fileInfo   = Get-Item -LiteralPath $fullPath
        $fileLength = $fileInfo.Length
        Write-Log "   FILE: $fullPath  size=$fileLength  type=$contentType"

        $rangeHeader = $context.Request.Headers['Range']
        if ($rangeHeader -and ($rangeHeader -match 'bytes=(\d+)-(\d*)')) {
          $start = [int64]$matches[1]
          
          $reqEnd = if ($matches[2] -ne '') { [int64]$matches[2] } else { $fileLength - 1 }
          if ($reqEnd -ge $fileLength) { $reqEnd = $fileLength - 1 }

          # Cap to 2 MB per response so the server never blocks for long
          $maxChunk = 2MB
          $end    = [Math]::Min($reqEnd, $start + $maxChunk - 1)

          $length = $end - $start + 1
          Write-Log "   RANGE requested: start=$start  end=$end  length=$length  fileSize=$fileLength"

          $fs = [System.IO.File]::OpenRead($fullPath)
          try {
            $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null

            $context.Response.StatusCode      = 206
            $context.Response.ContentType     = $contentType
            $context.Response.ContentLength64 = $length
            $context.Response.AddHeader('Content-Range', "bytes $start-$end/$fileLength")
            $context.Response.AddHeader('Accept-Ranges', 'bytes')
            Write-Log "   RESP 206  Content-Range: bytes $start-$end/$fileLength  Content-Length: $length"

            if ($context.Request.HttpMethod -ne 'HEAD') {
              $chunkSize = 256KB
              $remaining = $length
              $totalSent = 0
              $chunk = New-Object byte[] $chunkSize
              while ($remaining -gt 0) {
                $toRead = [Math]::Min($chunkSize, $remaining)
                $read = $fs.Read($chunk, 0, $toRead)
                if ($read -eq 0) { break }
                $context.Response.OutputStream.Write($chunk, 0, $read)
                $totalSent += $read
                $remaining -= $read
              }
              Write-Log "   SENT $totalSent bytes to client"
            }
          } finally {
            $fs.Close()
            try { $context.Response.OutputStream.Close() } catch {}
            Write-Log "   DONE range response"
          }

        } else {
          Write-Log "   FULL request (no Range header)  size=$fileLength"
          $bytes = [System.IO.File]::ReadAllBytes($fullPath)
          Write-Log "   ReadAllBytes got $($bytes.Length) bytes"
          $context.Response.StatusCode      = 200
          $context.Response.ContentType     = $contentType
          $context.Response.ContentLength64 = $fileLength
          $context.Response.AddHeader('Accept-Ranges', 'bytes')
          Write-Log "   RESP 200  Content-Length: $fileLength"
          if ($context.Request.HttpMethod -ne 'HEAD' -and $bytes.Length -gt 0) {
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Log "   SENT $($bytes.Length) bytes to client"
          }
          try { $context.Response.OutputStream.Close() } catch {}
          Write-Log "   DONE full response"
        }
      } catch {
        Write-Err "Exception serving '$requestPath': $($_.Exception.GetType().Name): $($_.Exception.Message)"
        Write-Err "  Stack: $($_.ScriptStackTrace)"
        try {
          $errBytes = [System.Text.Encoding]::UTF8.GetBytes('Internal Server Error')
          Send-HttpResponse -Context $context -StatusCode 500 -ContentType 'text/plain; charset=utf-8' -Bytes $errBytes
        } catch {}
      }
      continue
    }

    Write-Log "   404 NOT FOUND: $fullPath"
    $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
    Send-HttpResponse -Context $context -StatusCode 404 -ContentType 'text/plain; charset=utf-8' -Bytes $notFoundBytes
  }
}
finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}