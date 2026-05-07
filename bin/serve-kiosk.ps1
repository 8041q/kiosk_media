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

try {
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
    } catch {
      break
    }

    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
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
