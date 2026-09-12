param(
    $QualityMode = 'crf23',
    [switch]$FixVideos,
    [switch]$ScanOnly,
    [string[]]$SpecificFiles = @()
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$mediaRoot   = Join-Path $projectRoot 'media'
$manifestOut = Join-Path $mediaRoot 'manifest.js'
$videoExts   = @('.mp4', '.webm', '.mov')
$langFolders = [ordered]@{
    en = 'en'
    pt = 'pt'
    es = 'es'
    fr = 'fr'
    zh = 'zh'
}

$ffmpegPath = Join-Path $projectRoot 'bin\ffmpeg-wrapper.ps1'
if (-not (Test-Path -LiteralPath $ffmpegPath -PathType Leaf)) {
    Write-Error "FFmpeg wrapper not found at: $ffmpegPath"
    exit 1
}

$results = [System.Collections.ArrayList]@()
$specificFilesSet = @{}
if ($SpecificFiles.Count -gt 0) {
    foreach ($f in $SpecificFiles) {
        $specificFilesSet[$f.ToLower()] = $true
    }
}

function Get-VideoInfo {
    param(
        [string]$Path
    )

    try {
        $codec = & "$ffmpegPath" -probe -select_streams v:0 -show_entries stream=codec_name,codec_tag_string -of csv=p=0 "$Path" 2>$null
        $startTime = & "$ffmpegPath" -probe -show_entries format=start_time -of csv=p=0 "$Path" 2>$null
        $duration = & "$ffmpegPath" -probe -show_entries format=duration -of csv=p=0 "$Path" 2>$null
        $bitrate = & "$ffmpegPath" -probe -show_entries format=bit_rate -of csv=p=0 "$Path" 2>$null
        $width = & "$ffmpegPath" -probe -select_streams v:0 -show_entries stream=width -of csv=p=0 "$Path" 2>$null
        $height = & "$ffmpegPath" -probe -select_streams v:0 -show_entries stream=height -of csv=p=0 "$Path" 2>$null
        $size = (Get-Item -LiteralPath $Path).Length

        return @{
            Codec      = $codec.Trim()
            StartTime  = if ($startTime) { [double]$startTime.Trim() } else { 0 }
            Duration   = if ($duration) { [double]$duration.Trim() } else { 0 }
            Bitrate    = if ($bitrate) { [long]$bitrate.Trim() } else { 0 }
            Width      = if ($width) { [int]$width.Trim() } else { 0 }
            Height     = if ($height) { [int]$height.Trim() } else { 0 }
            Size       = $size
            SizeMB     = [math]::Round($size / 1MB, 2)
        }
    } catch {
        return @{
            Codec      = 'ERROR'
            StartTime  = 0
            Duration   = 0
            Bitrate    = 0
            Width      = 0
            Height     = 0
            Size       = 0
            SizeMB     = 0
            Error      = $_.Exception.Message
        }
    }
}

function Test-VideoNeedsFix {
    param(
        [hashtable]$Info,
        [string]$Extension
    )

    if ($Info.Codec -eq 'ERROR') { return $true }
    if ($Extension -notin @('.mp4')) { return $true }

    $isH264 = $Info.Codec -match 'h264|avc1'
    $hasFastStart = $Info.StartTime -le 0.1

    return (-not $isH264) -or (-not $hasFastStart)
}

function Fix-Video {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [string]$QualityMode
    )

    $vcodec = if ($QualityMode -eq 'lossless') {
        '-c:v libx264 -crf 0 -preset ultrafast'
    } else {
        '-c:v libx264 -crf 23 -preset medium'
    }

    $acodec = '-c:a aac -b:a 128k'
    $faststart = '-movflags +faststart'

    try {
        & "$ffmpegPath" -y -i "$InputPath" $vcodec $acodec $faststart "$OutputPath" 2>&1
        return @{ Success = $true; Error = $null }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Convert-ToMp4 {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [string]$QualityMode
    )

    $vcodec = if ($QualityMode -eq 'lossless') {
        '-c:v libx264 -crf 0 -preset ultrafast'
    } else {
        '-c:v libx264 -crf 23 -preset medium'
    }

    $acodec = '-c:a aac -b:a 128k'
    $faststart = '-movflags +faststart'

    try {
        & "$ffmpegPath" -y -i "$InputPath" $vcodec $acodec $faststart "$OutputPath" 2>&1
        return @{ Success = $true; Error = $null }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Get-ManifestPaths {
    param(
        [string]$FolderPath,
        [string]$FolderName
    )

    if (-not (Test-Path $FolderPath)) {
        return @()
    }

    $files = Get-ChildItem -LiteralPath $FolderPath -File |
        Where-Object { $videoExts -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object Name

    $output = @()

    foreach ($file in $files) {
        $filePath = $file.FullName
        $relPath = 'media/{0}/{1}' -f $FolderName, [Uri]::EscapeDataString($file.Name)
        $ext = $file.Extension.ToLowerInvariant()

        $info = Get-VideoInfo -Path $filePath
        $needsFix = Test-VideoNeedsFix -Info $info -Extension $ext

        $isSpecificFile = $specificFilesSet.ContainsKey($file.Name.ToLower())

        $result = @{
            File        = $file.Name
            Path        = $filePath
            RelPath     = $relPath
            Extension   = $ext
            Codec       = $info.Codec
            StartTime   = $info.StartTime
            Duration    = $info.Duration
            Bitrate     = $info.Bitrate
            Width       = $info.Width
            Height      = $info.Height
            SizeMB      = $info.SizeMB
            NeedsFix    = $needsFix
            Status      = 'pending'
            Error       = $null
            OutputPath  = $null
        }

        if ($needsFix -and $FixVideos -and ($specificFilesSet.Count -eq 0 -or $isSpecificFile)) {
            Write-Output ("Processing: {0} ({1})" -f $file.Name, $info.Codec)

            $outputName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + '.mp4'
            $tempPath = Join-Path (Split-Path -Parent $filePath) ($outputName + '.tmp')
            $finalPath = Join-Path (Split-Path -Parent $filePath) $outputName

            if ($ext -eq '.mp4') {
                $fixResult = Fix-Video -InputPath $filePath -OutputPath $tempPath -QualityMode $QualityMode
                if ($fixResult.Success) {
                    Move-Item -Force -LiteralPath $tempPath -Destination $finalPath
                    $result.Status = 'fixed'
                    $result.OutputPath = $finalPath
                    $result.RelPath = 'media/{0}/{1}' -f $FolderName, [Uri]::EscapeDataString($outputName)
                } else {
                    $result.Status = 'error'
                    $result.Error = $fixResult.Error
                }
            } else {
                $convResult = Convert-ToMp4 -InputPath $filePath -OutputPath $tempPath -QualityMode $QualityMode
                if ($convResult.Success) {
                    Move-Item -Force -LiteralPath $tempPath -Destination $finalPath
                    $result.Status = 'converted'
                    $result.OutputPath = $finalPath
                    $result.RelPath = 'media/{0}/{1}' -f $FolderName, [Uri]::EscapeDataString($outputName)
                } else {
                    $result.Status = 'error'
                    $result.Error = $convResult.Error
                }
            }
        } elseif ($needsFix) {
            $result.Status = 'needs_fix'
        } else {
            $result.Status = 'ok'
        }

        $results.Add($result) | Out-Null

        if (-not $needsFix -or $result.Status -in @('fixed', 'converted')) {
            $output += $result.RelPath
        }
    }

    return $output
}

$manifest = [ordered]@{}
$totalFiles = 0
$processedFiles = 0

foreach ($lang in $langFolders.GetEnumerator()) {
    $folderName = $lang.Value
    $folderPath = Join-Path $mediaRoot $folderName
    if (-not (Test-Path -LiteralPath $folderPath -PathType Container)) {
        New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
        Write-Output ('Created media folder: {0}' -f $folderPath)
    }
    $manifest[$lang.Key] = @(Get-ManifestPaths -FolderPath $folderPath -FolderName $folderName)
}

if (-not $ScanOnly) {
    $json = $manifest | ConvertTo-Json -Depth 4
    $content = @(
        'window.KIOSK_MEDIA_MANIFEST = ' + $json + ';',
        ''
    ) -join [Environment]::NewLine
    Set-Content -LiteralPath $manifestOut -Value $content -Encoding UTF8
    Write-Output ('Wrote media manifest: {0}' -f $manifestOut)
}

$summary = @{
    Total       = $results.Count
    OK          = ($results | Where-Object { $_.Status -eq 'ok' }).Count
    Fixed       = ($results | Where-Object { $_.Status -eq 'fixed' }).Count
    Converted   = ($results | Where-Object { $_.Status -eq 'converted' }).Count
    NeedsFix    = ($results | Where-Object { $_.Status -eq 'needs_fix' }).Count
    Errors      = ($results | Where-Object { $_.Status -eq 'error' }).Count
    Results     = $results
}

$summary | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $mediaRoot 'video-fix-report.json') -Encoding UTF8
Write-Output ('SUMMARY: Total={0}, OK={1}, Fixed={2}, Converted={3}, NeedsFix={4}, Errors={5}' -f $summary.Total, $summary.OK, $summary.Fixed, $summary.Converted, $summary.NeedsFix, $summary.Errors)