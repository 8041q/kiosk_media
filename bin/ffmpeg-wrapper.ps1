param(
    [string]$Command,
    [string[]]$Args
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ffmpegDir = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin'

$ffmpegExe = Join-Path $ffmpegDir 'ffmpeg.exe'
$ffprobeExe = Join-Path $ffmpegDir 'ffprobe.exe'

if (-not (Test-Path -LiteralPath $ffmpegExe -PathType Leaf)) {
    Write-Error "ffmpeg.exe not found at: $ffmpegExe"
    exit 1
}
if (-not (Test-Path -LiteralPath $ffprobeExe -PathType Leaf)) {
    Write-Error "ffprobe.exe not found at: $ffprobeExe"
    exit 1
}

if ($Command -eq 'probe') {
    & $ffprobeExe -v error @Args
} elseif ($Command -eq 'encode') {
    & $ffmpegExe -hide_banner -loglevel error @Args
} else {
    Write-Error "Unknown command: $Command"
    exit 1
}