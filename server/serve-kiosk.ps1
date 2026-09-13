param(
  [string]$RootPath,
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
if (-not $RootPath) { $RootPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }
$resolvedRoot = (Resolve-Path -LiteralPath $RootPath).Path
. (Join-Path $resolvedRoot 'server\media.ps1')

$prefix = "http://127.0.0.1:$Port/"
$configFilePath = Join-Path $resolvedRoot 'config\kiosk-config.json'
$runtimeDir = Join-Path $resolvedRoot '.runtime'
$jobsDir = Join-Path $runtimeDir 'jobs'
$browserPidFilePath = Join-Path $resolvedRoot '.runtime\browser.pid'
$sessionToken = [Guid]::NewGuid().ToString('N')
$githubUrl = 'https://github.com/8041q/kiosk_media'
$issuesUrl = 'https://github.com/8041q/kiosk_media/issues'
foreach ($dir in @((Split-Path -Parent $configFilePath), $runtimeDir, $jobsDir, (Join-Path $resolvedRoot 'logs'))) {
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

$mimeTypes = @{
  '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.gif'='image/gif'; '.webp'='image/webp'; '.ico'='image/x-icon'
  '.mp4'='video/mp4'; '.m4v'='video/mp4'; '.webm'='video/webm'; '.mov'='video/quicktime'; '.mkv'='video/x-matroska'; '.avi'='video/x-msvideo'; '.wmv'='video/x-ms-wmv'; '.mpg'='video/mpeg'; '.mpeg'='video/mpeg'; '.ogg'='video/ogg'; '.ogv'='video/ogg'
  '.txt'='text/plain; charset=utf-8'
}

function Write-Log { param([string]$Message) $stamp = (Get-Date).ToString('HH:mm:ss.fff'); [Console]::Out.WriteLine(('[' + $stamp + '] ' + $Message)); [Console]::Out.Flush() }
function Write-Err { param([string]$Message) $stamp = (Get-Date).ToString('HH:mm:ss.fff'); [Console]::Error.WriteLine(('[' + $stamp + '] ERROR ' + $Message)); [Console]::Error.Flush() }

function Send-Response {
  param($Context, [int]$StatusCode, [string]$ContentType, [byte[]]$Bytes=@())
  try {
    $Context.Response.StatusCode = $StatusCode; $Context.Response.ContentType = $ContentType; $Context.Response.ContentLength64 = $Bytes.Length
    $Context.Response.Headers['Cache-Control'] = 'no-store'
    if ($Context.Request.HttpMethod -ne 'HEAD' -and $Bytes.Length -gt 0) { $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length) }
  } catch {} finally { try { $Context.Response.OutputStream.Close() } catch {} }
}

function Send-Json {
  param($Context, [int]$StatusCode, $Payload)
  $json = $Payload | ConvertTo-Json -Depth 12
  Send-Response -Context $Context -StatusCode $StatusCode -ContentType 'application/json; charset=utf-8' -Bytes ([System.Text.Encoding]::UTF8.GetBytes($json))
}

function Read-JsonBody {
  param($Context)
  $reader = New-Object System.IO.StreamReader($Context.Request.InputStream, [System.Text.Encoding]::UTF8)
  try { $text = $reader.ReadToEnd() } finally { $reader.Close() }
  if ([string]::IsNullOrWhiteSpace($text)) { return [pscustomobject]@{} }
  return $text | ConvertFrom-Json
}

function Test-MutationToken {
  param($Context)
  $token = $Context.Request.Headers['X-Kiosk-Token']
  if ($token -and $token -eq $sessionToken) { return $true }
  Send-Json -Context $Context -StatusCode 403 -Payload @{ ok=$false; error='Invalid kiosk session token.' }
  return $false
}

function Get-SafeJobPath {
  param([string]$JobId)
  if ($JobId -notmatch '^[a-f0-9]{32}$') { throw 'Invalid job id.' }
  return Join-Path $jobsDir ($JobId + '.json')
}

function Read-JobState {
  param([string]$JobId)
  $path = Get-SafeJobPath -JobId $JobId
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
  return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-JobState {
  param([string]$Path, $State)
  $json = $State | ConvertTo-Json -Depth 12
  [System.IO.File]::WriteAllText($Path, $json, (New-Object System.Text.UTF8Encoding -ArgumentList $false))
}

function Get-RunningJobState {
  foreach ($file in (Get-ChildItem -LiteralPath $jobsDir -File -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTimeUtc -Descending)) {
    try {
      $job = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($job.state -notin @('queued','running')) { continue }
      $alive = $false
      if ($job.workerPid -and ([string]$job.workerPid -match '^\d+$')) {
        $alive = $null -ne (Get-Process -Id ([int]$job.workerPid) -ErrorAction SilentlyContinue)
      } elseif ($job.state -eq 'queued') {
        $age = [DateTime]::UtcNow - $file.LastWriteTimeUtc
        $alive = $age.TotalSeconds -lt 30
      }
      if ($alive) { return $job }
      $job.state = 'failed'
      $job.error = 'The processing worker stopped unexpectedly.'
      $job.finishedAt = [DateTime]::UtcNow.ToString('o')
      $job.updatedAt = [DateTime]::UtcNow.ToString('o')
      Write-JobState -Path $file.FullName -State $job
    } catch {}
  }
  return $null
}

function Has-RunningJob { return $null -ne (Get-RunningJobState) }

function Start-MediaJob {
  param([string]$Profile, [string[]]$Files)
  if ($Profile -notin @('recommended','high','smaller')) { throw 'Invalid processing profile.' }
  if (-not $Files -or $Files.Count -eq 0) { throw 'No files were selected.' }
  if (Has-RunningJob) { throw 'Another video-processing job is already running.' }
  $validated = @()
  foreach ($src in $Files) {
    $full = Resolve-KioskMediaPath -RootPath $resolvedRoot -Src ([string]$src)
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "Media file not found: $src" }
    $validated += [string]$src
  }
  $id = [Guid]::NewGuid().ToString('N'); $jobPath = Join-Path $jobsDir ($id + '.json')
  $state = [pscustomobject]@{
    id=$id; state='queued'; profile=$Profile; files=@($validated); total=$validated.Count; completed=0; current=''; currentPercent=0; overallPercent=0
    workerPid=$null; results=@(); log=@(); createdAt=[DateTime]::UtcNow.ToString('o'); updatedAt=[DateTime]::UtcNow.ToString('o')
    startedAt=$null; finishedAt=$null; error=''
  }
  Write-JobState -Path $jobPath -State $state
  $worker = Join-Path $resolvedRoot 'server\media-job.ps1'
  $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"' -f $worker),'-RootPath',('"{0}"' -f $resolvedRoot),'-JobPath',('"{0}"' -f $jobPath))
  Start-Process -FilePath 'powershell.exe' -ArgumentList ($args -join ' ') -WindowStyle Hidden | Out-Null
  return $id
}

function Get-PidFromFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  $raw = (Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue).Trim()
  if ($raw -match '^\d+$') { return [int]$raw }
  return $null
}

function Start-DetachedShutdownWorker {
  param([int]$ServerPid)
  $workerPath = Join-Path $env:TEMP ('kiosk-shutdown-{0}.ps1' -f [Guid]::NewGuid().ToString('N'))
  $script = @'
param([int]$ServerPid,[string]$BrowserPidFile,[string]$SelfPath)
Start-Sleep -Milliseconds 900
try {
  if (Test-Path -LiteralPath $BrowserPidFile) {
    $raw=(Get-Content -LiteralPath $BrowserPidFile -Raw -ErrorAction SilentlyContinue).Trim()
    if ($raw -match '^\d+$') { & taskkill /F /T /PID ([int]$raw) 2>&1 | Out-Null }
    Remove-Item -LiteralPath $BrowserPidFile -Force -ErrorAction SilentlyContinue
  }
  & taskkill /F /T /PID $ServerPid 2>&1 | Out-Null
} finally { Remove-Item -LiteralPath $SelfPath -Force -ErrorAction SilentlyContinue }
'@
  Set-Content -LiteralPath $workerPath -Value $script -Encoding ASCII
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"' -f $workerPath),'-ServerPid',$ServerPid,'-BrowserPidFile',('"{0}"' -f $browserPidFilePath),'-SelfPath',('"{0}"' -f $workerPath)) | Out-Null
}

function Serve-StaticFile {
  param($Context, [string]$RequestPath)
  if ([string]::IsNullOrWhiteSpace($RequestPath)) { $RequestPath='index.html' }
  $allowedStatic = ($RequestPath -eq 'index.html') -or $RequestPath.StartsWith('assets/') -or $RequestPath.StartsWith('src/') -or $RequestPath.StartsWith('media/')
  if (-not $allowedStatic) { Send-Response $Context 404 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Not Found')); return }
  $candidate = Join-Path $resolvedRoot ($RequestPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
  $full = [System.IO.Path]::GetFullPath($candidate)
  $rootPrefix = $resolvedRoot.TrimEnd([char[]]@('\','/')) + [System.IO.Path]::DirectorySeparatorChar
  if (-not ($full -eq $resolvedRoot -or $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase))) { Send-Response $Context 403 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Forbidden')); return }
  if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { Send-Response $Context 404 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Not Found')); return }
  $file = Get-Item -LiteralPath $full; $length=[int64]$file.Length; $ext=$file.Extension.ToLowerInvariant(); $contentType='application/octet-stream'
  if ($mimeTypes.ContainsKey($ext)) { $contentType=$mimeTypes[$ext] }
  $Context.Response.Headers['Accept-Ranges']='bytes'
  $range=$Context.Request.Headers['Range']
  $start=[int64]0; $end=$length-1; $partial=$false
  if ($range -and $range -match '^bytes=(\d+)-(\d*)$') {
    $start=[int64]$Matches[1]; if ($Matches[2]) { $end=[Math]::Min([int64]$Matches[2],$length-1) }; $partial=$true
    if ($start -ge $length -or $end -lt $start) { $Context.Response.StatusCode=416; $Context.Response.Headers['Content-Range']="bytes */$length"; $Context.Response.OutputStream.Close(); return }
  }
  $sendLength=$end-$start+1; $Context.Response.StatusCode=200; if($partial){$Context.Response.StatusCode=206}; $Context.Response.ContentType=$contentType; $Context.Response.ContentLength64=$sendLength
  if ($partial) { $Context.Response.Headers['Content-Range']="bytes $start-$end/$length" }
  if ($RequestPath -notmatch '^media/') { $Context.Response.Headers['Cache-Control']='no-cache' }
  if ($Context.Request.HttpMethod -eq 'HEAD') { $Context.Response.OutputStream.Close(); return }
  $stream=[System.IO.File]::Open($full,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
  try {
    if ($start -gt 0) { $stream.Seek($start,[IO.SeekOrigin]::Begin) | Out-Null }
    $buffer=New-Object byte[] 262144; [int64]$remaining=$sendLength
    while($remaining -gt 0) { $toRead=[int][Math]::Min($buffer.Length,$remaining); $read=$stream.Read($buffer,0,$toRead); if($read -le 0){break}; $Context.Response.OutputStream.Write($buffer,0,$read); $remaining-=$read }
  } finally { $stream.Dispose(); try{$Context.Response.OutputStream.Close()}catch{} }
}

$listener=New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix); $listener.Start()
Write-Log "=== Kiosk v2 server starting on $prefix ==="
Write-Log "Root: $resolvedRoot"

try {
  while ($listener.IsListening) {
    try { $context=$listener.GetContext() } catch { break }
    try {
      $path=[Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/')); $method=$context.Request.HttpMethod.ToUpperInvariant()
      Write-Log ">> $method /$path"

      if ($path -eq 'api/health' -and $method -eq 'GET') { Send-Json $context 200 @{ok=$true;apiVersion=3;appVersion='2.2.0';time=[DateTime]::UtcNow.ToString('o')}; continue }
      if ($path -eq 'api/session' -and $method -eq 'GET') { Send-Json $context 200 @{ok=$true;token=$sessionToken}; continue }
      if ($path -eq 'api/catalog' -and $method -eq 'GET') { Send-Json $context 200 (Get-KioskCatalog -RootPath $resolvedRoot); continue }

      if ($path -eq 'api/config') {
        if ($method -eq 'GET') {
          if (Test-Path -LiteralPath $configFilePath) { $raw=Get-Content -LiteralPath $configFilePath -Raw -Encoding UTF8; $null=$raw|ConvertFrom-Json; Send-Response $context 200 'application/json; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes($raw)) }
          else { Send-Json $context 200 @{} }
        } elseif ($method -eq 'POST') {
          if (-not (Test-MutationToken $context)) { continue }; $body=Read-JsonBody $context; $json=$body|ConvertTo-Json -Depth 10; [IO.File]::WriteAllText($configFilePath,$json,(New-Object System.Text.UTF8Encoding -ArgumentList $false)); Send-Json $context 200 @{ok=$true}
        } else { Send-Json $context 405 @{ok=$false;error='Method Not Allowed'} }
        continue
      }

      if ($path -eq 'api/video-analysis' -and $method -eq 'POST') {
        if (-not (Test-MutationToken $context)) { continue }; $body=Read-JsonBody $context; $files=@(); if($body.files){$files=@($body.files|ForEach-Object{[string]$_})}; Send-Json $context 200 (Get-KioskLibraryAnalysis -RootPath $resolvedRoot -Files $files); continue
      }

      if ($path -eq 'api/video-jobs' -and $method -eq 'POST') {
        if (-not (Test-MutationToken $context)) { continue }; $body=Read-JsonBody $context
        try { $id=Start-MediaJob -Profile ([string]$body.profile) -Files @($body.files|ForEach-Object{[string]$_}); Send-Json $context 202 @{ok=$true;jobId=$id} }
        catch { $status = 400; if ($_.Exception.Message -like 'Another*') { $status = 409 }; Send-Json $context $status @{ok=$false;error=$_.Exception.Message} }; continue
      }

      if ($path -eq 'api/video-jobs/current' -and $method -eq 'GET') {
        $running=Get-RunningJobState; if($running){Send-Json $context 200 $running}else{Send-Json $context 200 @{ok=$true;state='idle'}}; continue
      }

      if ($path -match '^api/video-jobs/([a-f0-9]{32})$' -and $method -eq 'GET') {
        $job=Read-JobState -JobId $Matches[1]; if($job){Send-Json $context 200 $job}else{Send-Json $context 404 @{ok=$false;error='Job not found.'}}; continue
      }
      if ($path -match '^api/video-jobs/([a-f0-9]{32})/cancel$' -and $method -eq 'POST') {
        if (-not (Test-MutationToken $context)) { continue }; $job=Read-JobState -JobId $Matches[1]
        if(-not $job){Send-Json $context 404 @{ok=$false;error='Job not found.'};continue}; $cancel=Join-Path $jobsDir ($Matches[1]+'.cancel'); Set-Content -LiteralPath $cancel -Value 'cancel' -Encoding ASCII; Send-Json $context 200 @{ok=$true}; continue
      }

      if ($path -eq 'api/open-github' -or $path -eq 'api/open-issues') {
        if ($method -ne 'POST') { Send-Json $context 405 @{ok=$false;error='Method Not Allowed'}; continue }; if(-not(Test-MutationToken $context)){continue}
        $url=$issuesUrl; if($path -eq 'api/open-github'){$url=$githubUrl}; Start-Process $url | Out-Null; Send-Json $context 200 @{ok=$true}; continue
      }
      if ($path -eq 'api/exit') {
        if ($method -ne 'POST') { Send-Json $context 405 @{ok=$false;error='Method Not Allowed'}; continue }; if(-not(Test-MutationToken $context)){continue}
        Send-Json $context 200 @{ok=$true;shuttingDown=$true;browserPid=(Get-PidFromFile $browserPidFilePath)}; Start-DetachedShutdownWorker -ServerPid $PID; continue
      }

      if ($path.StartsWith('api/')) { Send-Json $context 404 @{ok=$false;error='API route not found.'}; continue }
      Serve-StaticFile -Context $context -RequestPath $path
    } catch {
      Write-Err $_.Exception.Message
      try { Send-Json $context 500 @{ok=$false;error=$_.Exception.Message} } catch {}
    }
  }
} finally { if($listener.IsListening){$listener.Stop()}; $listener.Close() }
