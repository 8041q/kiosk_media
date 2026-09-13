# Media catalog, analysis, FFmpeg resolution and safe processing helpers.

$script:KioskLanguages = @('en', 'zh', 'pt', 'es', 'fr')
$script:KioskVideoExtensions = @('.mp4', '.m4v', '.mov', '.webm', '.mkv', '.avi', '.wmv', '.mpg', '.mpeg', '.ogg', '.ogv')
$script:KioskFfmpegTools = $null

function Get-KioskMediaRoot {
  param([Parameter(Mandatory=$true)][string]$RootPath)
  return [System.IO.Path]::GetFullPath((Join-Path $RootPath 'media'))
}

function ConvertTo-KioskRelativePath {
  param([Parameter(Mandatory=$true)][string]$RootPath, [Parameter(Mandatory=$true)][string]$FullPath)
  $root = [System.IO.Path]::GetFullPath($RootPath).TrimEnd([char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar))
  $full = [System.IO.Path]::GetFullPath($FullPath)
  $prefix = $root + [System.IO.Path]::DirectorySeparatorChar
  if (-not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Path is outside the kiosk root.' }
  return $full.Substring($prefix.Length).Replace('\', '/')
}

function Resolve-KioskMediaPath {
  param([Parameter(Mandatory=$true)][string]$RootPath, [Parameter(Mandatory=$true)][string]$Src)
  $decoded = [System.Uri]::UnescapeDataString($Src).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
  $full = [System.IO.Path]::GetFullPath((Join-Path $RootPath $decoded))
  $mediaRoot = (Get-KioskMediaRoot -RootPath $RootPath).TrimEnd([char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar))
  $prefix = $mediaRoot + [System.IO.Path]::DirectorySeparatorChar
  if (-not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Requested media path is outside the media directory.' }
  if ($full -match '[\\/]\.originals[\\/]') { throw 'Original backup files are not addressable as active media.' }
  return $full
}

function Get-KioskTitleFromName {
  param([string]$Name)
  $base = [System.IO.Path]::GetFileNameWithoutExtension($Name) -replace '[_-]+', ' '
  return (Get-Culture).TextInfo.ToTitleCase($base.Trim().ToLower())
}

function Get-KioskCatalog {
  param([Parameter(Mandatory=$true)][string]$RootPath)
  $mediaRoot = Get-KioskMediaRoot -RootPath $RootPath
  $languages = @{}
  foreach ($lang in $script:KioskLanguages) {
    $items = @()
    $langRoot = Join-Path $mediaRoot $lang
    if (Test-Path -LiteralPath $langRoot -PathType Container) {
      $files = Get-ChildItem -LiteralPath $langRoot -File -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $script:KioskVideoExtensions -contains $_.Extension.ToLowerInvariant()
      } | Sort-Object FullName
      foreach ($file in $files) {
        $relative = ConvertTo-KioskRelativePath -RootPath $RootPath -FullPath $file.FullName
        $items += [pscustomobject]@{
          id = $relative
          src = $relative
          name = $file.Name
          title = Get-KioskTitleFromName -Name $file.Name
          language = $lang
          size = $file.Length
          modifiedAt = $file.LastWriteTimeUtc.ToString('o')
        }
      }
    }
    $languages[$lang] = @($items)
  }
  return [pscustomobject]@{ ok = $true; languages = $languages; refreshedAt = [DateTime]::UtcNow.ToString('o') }
}

function Resolve-KioskFfmpegTools {
  if ($script:KioskFfmpegTools) { return $script:KioskFfmpegTools }

  $ffmpegCandidates = @()
  $ffprobeCandidates = @()
  foreach ($name in @('ffmpeg.exe', 'ffmpeg')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $ffmpegCandidates += $cmd.Source }
  }
  foreach ($name in @('ffprobe.exe', 'ffprobe')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $ffprobeCandidates += $cmd.Source }
  }
  if ($env:LOCALAPPDATA) {
    $wingetRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    if (Test-Path -LiteralPath $wingetRoot -PathType Container) {
      $pkgDirs = Get-ChildItem -LiteralPath $wingetRoot -Directory -Filter 'Gyan.FFmpeg*' -ErrorAction SilentlyContinue
      foreach ($pkg in $pkgDirs) {
        $ffmpegCandidates += (Get-ChildItem -LiteralPath $pkg.FullName -File -Recurse -Filter 'ffmpeg.exe' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
        $ffprobeCandidates += (Get-ChildItem -LiteralPath $pkg.FullName -File -Recurse -Filter 'ffprobe.exe' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
      }
    }
  }

  $ffmpeg = $ffmpegCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
  $ffprobe = $ffprobeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
  if (-not $ffmpeg -or -not $ffprobe) {
    throw 'FFmpeg/ffprobe were not found. Install FFmpeg with WinGet or add ffmpeg.exe and ffprobe.exe to PATH.'
  }
  $script:KioskFfmpegTools = [pscustomobject]@{ Ffmpeg = $ffmpeg; Ffprobe = $ffprobe }
  return $script:KioskFfmpegTools
}

function Invoke-KioskFfprobe {
  param([Parameter(Mandatory=$true)][string]$RootPath, [Parameter(Mandatory=$true)][string]$FullPath)
  $tools = Resolve-KioskFfmpegTools
  $raw = & $tools.Ffprobe '-v' 'error' '-show_streams' '-show_format' '-print_format' 'json' $FullPath 2>$null | Out-String
  if (-not $raw.Trim()) { throw 'ffprobe returned no metadata.' }
  return $raw | ConvertFrom-Json
}

function Read-KioskUInt32BE {
  param([System.IO.Stream]$Stream)
  $b = New-Object byte[] 4
  if ($Stream.Read($b, 0, 4) -ne 4) { return $null }
  return [uint64](([uint64]$b[0] -shl 24) -bor ([uint64]$b[1] -shl 16) -bor ([uint64]$b[2] -shl 8) -bor [uint64]$b[3])
}

function Read-KioskUInt64BE {
  param([System.IO.Stream]$Stream)
  $b = New-Object byte[] 8
  if ($Stream.Read($b, 0, 8) -ne 8) { return $null }
  [uint64]$value = 0
  foreach ($byte in $b) { $value = ($value -shl 8) -bor [uint64]$byte }
  return $value
}

function Test-KioskMp4FastStart {
  param([Parameter(Mandatory=$true)][string]$FullPath)
  if ([System.IO.Path]::GetExtension($FullPath).ToLowerInvariant() -notin @('.mp4', '.m4v', '.mov')) { return $false }
  $stream = [System.IO.File]::Open($FullPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    [uint64]$position = 0
    while ($position + 8 -le [uint64]$stream.Length) {
      $stream.Position = [int64]$position
      $size = Read-KioskUInt32BE -Stream $stream
      if ($null -eq $size) { break }
      $typeBytes = New-Object byte[] 4
      if ($stream.Read($typeBytes, 0, 4) -ne 4) { break }
      $type = [System.Text.Encoding]::ASCII.GetString($typeBytes)
      [uint64]$headerSize = 8
      [uint64]$atomSize = $size
      if ($size -eq 1) { $atomSize = Read-KioskUInt64BE -Stream $stream; $headerSize = 16 }
      elseif ($size -eq 0) { $atomSize = [uint64]$stream.Length - $position }
      if ($type -eq 'moov') { return $true }
      if ($type -eq 'mdat') { return $false }
      if ($atomSize -lt $headerSize) { break }
      $position += $atomSize
    }
    return $false
  } finally { $stream.Dispose() }
}

function ConvertTo-KioskDouble {
  param($Value)
  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return 0.0 }
  try { return [double]::Parse([string]$Value, [System.Globalization.CultureInfo]::InvariantCulture) } catch { return 0.0 }
}

function Get-KioskVideoAnalysisFromPath {
  param(
    [Parameter(Mandatory=$true)][string]$RootPath,
    [Parameter(Mandatory=$true)][string]$FullPath,
    [Parameter(Mandatory=$true)][string]$Src,
    [string]$Language = ''
  )
  $file = Get-Item -LiteralPath $FullPath -ErrorAction Stop
  $probe = Invoke-KioskFfprobe -RootPath $RootPath -FullPath $FullPath
  $video = @($probe.streams | Where-Object { $_.codec_type -eq 'video' }) | Select-Object -First 1
  $audio = @($probe.streams | Where-Object { $_.codec_type -eq 'audio' }) | Select-Object -First 1
  if (-not $video) {
    return [pscustomobject]@{ src=$Src; name=$file.Name; language=$Language; status='error'; action='none'; reason='No video stream was found.'; size=$file.Length; duration=0 }
  }

  $extension = $file.Extension.ToLowerInvariant()
  $videoCodec = [string]$video.codec_name
  $audioCodec = ''
  if ($audio) { $audioCodec = [string]$audio.codec_name }
  $pixelFormat = [string]$video.pix_fmt
  $duration = ConvertTo-KioskDouble -Value $probe.format.duration
  if ($duration -le 0 -and $video.duration) { $duration = ConvertTo-KioskDouble -Value $video.duration }
  $fastStart = $false
  if ($extension -eq '.mp4') { $fastStart = Test-KioskMp4FastStart -FullPath $FullPath }
  $videoCompatible = ($videoCodec -eq 'h264') -and ($pixelFormat -in @('yuv420p', 'yuvj420p'))
  $audioCompatible = (-not $audio) -or ($audioCodec -eq 'aac')

  if ($extension -eq '.mp4' -and $videoCompatible -and $audioCompatible -and $fastStart) {
    $status = 'ready'; $action = 'none'; $reason = 'Kiosk-compatible H.264/AAC MP4 with fast-start optimization.'
  } elseif ($videoCompatible -and $audioCompatible) {
    $status = 'optimize'; $action = 'remux'
    if ($extension -eq '.mp4') { $reason = 'Compatible codecs; optimize the MP4 container without re-encoding.' }
    else { $reason = 'Compatible codecs; remux to MP4 without quality loss.' }
  } else {
    $status = 'transcode'; $action = 'transcode'
    $parts = @()
    if (-not $videoCompatible) { $parts += "video $videoCodec/$pixelFormat" }
    if (-not $audioCompatible) { $parts += "audio $audioCodec" }
    $reason = 'Transcode required for kiosk compatibility: ' + ($parts -join ', ') + '.'
  }

  return [pscustomobject]@{
    src = $Src; name = $file.Name; language = $Language
    status = $status; action = $action; reason = $reason
    extension = $extension; container = [string]$probe.format.format_name
    videoCodec = $videoCodec; audioCodec = $audioCodec; pixelFormat = $pixelFormat
    width = [int]$video.width; height = [int]$video.height; duration = $duration; size = $file.Length
    fastStart = $fastStart
  }
}

function Get-KioskVideoAnalysis {
  param([Parameter(Mandatory=$true)][string]$RootPath, [Parameter(Mandatory=$true)][string]$Src, [string]$Language='')
  $full = Resolve-KioskMediaPath -RootPath $RootPath -Src $Src
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "Media file not found: $Src" }
  if (-not $Language) {
    $parts = $Src -split '/'
    if ($parts.Count -ge 2) { $Language = $parts[1] }
  }
  return Get-KioskVideoAnalysisFromPath -RootPath $RootPath -FullPath $full -Src $Src -Language $Language
}

function Get-KioskLibraryAnalysis {
  param([Parameter(Mandatory=$true)][string]$RootPath, [string[]]$Files=@())
  $catalog = Get-KioskCatalog -RootPath $RootPath
  $videos = @()
  foreach ($lang in $script:KioskLanguages) {
    foreach ($item in @($catalog.languages[$lang])) {
      if ($Files.Count -gt 0 -and $Files -notcontains $item.src) { continue }
      try { $videos += Get-KioskVideoAnalysis -RootPath $RootPath -Src $item.src -Language $lang }
      catch {
        $videos += [pscustomobject]@{ src=$item.src; name=$item.name; language=$lang; status='error'; action='none'; reason=$_.Exception.Message; size=$item.size; duration=0 }
      }
    }
  }
  return [pscustomobject]@{ ok=$true; videos=@($videos); analyzedAt=[DateTime]::UtcNow.ToString('o') }
}

function Get-KioskEncodingProfile {
  param([string]$Profile='recommended')
  switch ($Profile) {
    'high' { return [pscustomobject]@{ Name='high'; Crf='17'; Audio='256k'; Preset='medium' } }
    'smaller' { return [pscustomobject]@{ Name='smaller'; Crf='24'; Audio='128k'; Preset='medium' } }
    default { return [pscustomobject]@{ Name='recommended'; Crf='20'; Audio='192k'; Preset='medium' } }
  }
}

function Quote-KioskProcessArg {
  param([string]$Value)
  if ($null -eq $Value) { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + ($Value -replace '"', '\"') + '"'
}

function Invoke-KioskFfmpegProcess {
  param(
    [Parameter(Mandatory=$true)][string]$RootPath,
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [Parameter(Mandatory=$true)][string]$Action,
    [string]$Profile='recommended',
    [double]$Duration=0,
    [scriptblock]$ProgressCallback=$null,
    [scriptblock]$CancelCheck=$null
  )
  $tools = Resolve-KioskFfmpegTools
  $runtimeDir = Join-Path $RootPath '.runtime\jobs'
  if (-not (Test-Path -LiteralPath $runtimeDir)) { New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null }
  $token = [Guid]::NewGuid().ToString('N')
  $progressPath = Join-Path $runtimeDir "$token.progress"
  $errorPath = Join-Path $runtimeDir "$token.stderr.log"
  $args = @('-hide_banner', '-y', '-i', $InputPath, '-map', '0:v:0', '-map', '0:a?')
  if ($Action -eq 'remux') {
    $args += @('-c', 'copy', '-movflags', '+faststart')
  } else {
    $p = Get-KioskEncodingProfile -Profile $Profile
    $args += @('-c:v', 'libx264', '-preset', $p.Preset, '-crf', $p.Crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', $p.Audio, '-movflags', '+faststart')
  }
  $args += @('-progress', 'pipe:1', '-nostats', $OutputPath)
  $argumentLine = ($args | ForEach-Object { Quote-KioskProcessArg -Value ([string]$_) }) -join ' '
  $proc = Start-Process -FilePath $tools.Ffmpeg -ArgumentList $argumentLine -WindowStyle Hidden -PassThru -RedirectStandardOutput $progressPath -RedirectStandardError $errorPath
  try {
    while (-not $proc.HasExited) {
      if ($CancelCheck -and (& $CancelCheck)) {
        try { & taskkill /F /T /PID $proc.Id 2>&1 | Out-Null } catch { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
        throw (New-Object System.OperationCanceledException 'Processing cancelled.')
      }
      if ($ProgressCallback -and $Duration -gt 0 -and (Test-Path -LiteralPath $progressPath)) {
        try {
          $last = Get-Content -LiteralPath $progressPath -ErrorAction SilentlyContinue | Select-String '^out_time_ms=(\d+)$' | Select-Object -Last 1
          if ($last -and $last.Matches.Count) {
            $microseconds = [double]$last.Matches[0].Groups[1].Value
            $pct = [Math]::Min(99.0, [Math]::Max(0.0, (($microseconds / 1000000.0) / $Duration) * 100.0))
            & $ProgressCallback $pct
          }
        } catch {}
      }
      Start-Sleep -Milliseconds 450
      $proc.Refresh()
    }
    $proc.WaitForExit()
    if ($proc.ExitCode -ne 0) {
      $tail = ''
      if (Test-Path -LiteralPath $errorPath) { $tail = (Get-Content -LiteralPath $errorPath -Tail 20 -ErrorAction SilentlyContinue) -join "`n" }
      throw "FFmpeg failed with exit code $($proc.ExitCode). $tail"
    }
    if ($ProgressCallback) { & $ProgressCallback 100.0 }
  } finally {
    Remove-Item -LiteralPath $progressPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $errorPath -Force -ErrorAction SilentlyContinue
  }
}

function Get-KioskBackupPath {
  param([Parameter(Mandatory=$true)][string]$RootPath, [Parameter(Mandatory=$true)][string]$InputPath)
  $mediaRoot = Get-KioskMediaRoot -RootPath $RootPath
  $relative = $InputPath.Substring($mediaRoot.TrimEnd([char[]]@('\','/')).Length).TrimStart([char[]]@('\','/'))
  $target = Join-Path (Join-Path $mediaRoot '.originals') $relative
  $dir = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if (Test-Path -LiteralPath $target) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($target); $ext = [System.IO.Path]::GetExtension($target); $dir = Split-Path -Parent $target
    $target = Join-Path $dir ("{0}-{1}{2}" -f $base, (Get-Date -Format 'yyyyMMdd-HHmmss'), $ext)
  }
  return $target
}

function Get-KioskOutputPath {
  param([Parameter(Mandatory=$true)][string]$InputPath)
  if ([System.IO.Path]::GetExtension($InputPath).ToLowerInvariant() -eq '.mp4') { return $InputPath }
  $dir = Split-Path -Parent $InputPath; $base = [System.IO.Path]::GetFileNameWithoutExtension($InputPath)
  $candidate = Join-Path $dir ($base + '.mp4')
  if (-not (Test-Path -LiteralPath $candidate)) { return $candidate }
  for ($i=1; $i -le 99; $i++) {
    $candidate = Join-Path $dir ("{0}.kiosk-{1}.mp4" -f $base, $i)
    if (-not (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  throw 'Could not choose a free MP4 output filename.'
}

function Invoke-KioskProcessVideo {
  param(
    [Parameter(Mandatory=$true)][string]$RootPath,
    [Parameter(Mandatory=$true)]$Analysis,
    [string]$Profile='recommended',
    [scriptblock]$ProgressCallback=$null,
    [scriptblock]$CancelCheck=$null
  )
  if ($Analysis.status -eq 'ready') { return [pscustomobject]@{ src=$Analysis.src; status='ready'; action='none'; outputSrc=$Analysis.src; error='' } }
  if ($Analysis.status -eq 'error') { return [pscustomobject]@{ src=$Analysis.src; status='error'; action='none'; outputSrc=''; error=$Analysis.reason } }
  $input = Resolve-KioskMediaPath -RootPath $RootPath -Src $Analysis.src
  $final = Get-KioskOutputPath -InputPath $input
  $temp = Join-Path (Split-Path -Parent $final) (([System.IO.Path]::GetFileNameWithoutExtension($final)) + '.kiosk-tmp-' + [Guid]::NewGuid().ToString('N') + '.mp4')
  try {
    Invoke-KioskFfmpegProcess -RootPath $RootPath -InputPath $input -OutputPath $temp -Action $Analysis.action -Profile $Profile -Duration $Analysis.duration -ProgressCallback $ProgressCallback -CancelCheck $CancelCheck
    $tempAnalysis = Get-KioskVideoAnalysisFromPath -RootPath $RootPath -FullPath $temp -Src 'temporary.mp4' -Language $Analysis.language
    if ($tempAnalysis.status -ne 'ready') { throw "Processed file failed verification: $($tempAnalysis.reason)" }
    $backup = Get-KioskBackupPath -RootPath $RootPath -InputPath $input
    Move-Item -LiteralPath $input -Destination $backup -Force
    try { Move-Item -LiteralPath $temp -Destination $final -Force }
    catch { Move-Item -LiteralPath $backup -Destination $input -Force -ErrorAction SilentlyContinue; throw }
    $outputSrc = ConvertTo-KioskRelativePath -RootPath $RootPath -FullPath $final
    $backupSrc = ConvertTo-KioskRelativePath -RootPath $RootPath -FullPath $backup
    $resultStatus = 'transcoded'
    if ($Analysis.action -eq 'remux') { $resultStatus = 'optimized' }
    return [pscustomobject]@{ src=$Analysis.src; status=$resultStatus; action=$Analysis.action; outputSrc=$outputSrc; backupSrc=$backupSrc; error='' }
  } catch [System.OperationCanceledException] {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    throw
  } catch {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    return [pscustomobject]@{ src=$Analysis.src; status='error'; action=$Analysis.action; outputSrc=''; error=$_.Exception.Message }
  }
}
