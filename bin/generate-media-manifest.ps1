$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$mediaRoot   = Join-Path $projectRoot 'media'
$manifestOut = Join-Path $mediaRoot 'manifest.js'
$videoExts   = @('.mp4', '.webm', '.mov')
$langFolders = [ordered]@{
  en = 'en'
  pt = 'pt-pt'
  es = 'sp'
  fr = 'fr'
  zh = 'zh'
}

function Get-ManifestPaths {
  param(
    [string]$FolderPath,
    [string]$FolderName
  )

  if (-not (Test-Path $FolderPath)) {
    return @()
  }

  Get-ChildItem -LiteralPath $FolderPath -File |
    Where-Object { $videoExts -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name |
    ForEach-Object {
      'media/{0}/{1}' -f $FolderName, [Uri]::EscapeDataString($_.Name)
    }
}

$manifest = [ordered]@{}
foreach ($lang in $langFolders.GetEnumerator()) {
  $folderName = $lang.Value
  $folderPath = Join-Path $mediaRoot $folderName
  $manifest[$lang.Key] = @(Get-ManifestPaths -FolderPath $folderPath -FolderName $folderName)
}

$json = $manifest | ConvertTo-Json -Depth 4
$content = @(
  'window.KIOSK_MEDIA_MANIFEST = ' + $json + ';',
  ''
) -join [Environment]::NewLine

Set-Content -LiteralPath $manifestOut -Value $content -Encoding UTF8
Write-Output ('Wrote media manifest: {0}' -f $manifestOut)
