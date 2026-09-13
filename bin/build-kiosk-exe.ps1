$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sourcePath = Join-Path $projectRoot 'bin\kiosk-launcher.cs'
$outputPath = Join-Path $projectRoot 'kiosk.exe'
$tempOutput = Join-Path $projectRoot 'kiosk.new.exe'
$iconPath = Join-Path $projectRoot 'assets\favicon.ico'

if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
  throw "Launcher source was not found: $sourcePath"
}

Remove-Item -LiteralPath $tempOutput -Force -ErrorAction SilentlyContinue

function Find-CSharpCompiler {
  $command = Get-Command csc.exe -ErrorAction SilentlyContinue
  if ($command -and $command.Source) { return $command.Source }

  $candidates = @()
  if ($env:WINDIR) {
    $candidates += (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe')
    $candidates += (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
  }
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  }
  return $null
}

function Invoke-CscBuild {
  param(
    [Parameter(Mandatory=$true)][string]$Compiler,
    [switch]$UseIcon
  )

  $args = @(
    '/nologo',
    '/target:winexe',
    '/optimize+',
    '/platform:anycpu',
    '/reference:System.dll',
    '/reference:System.Windows.Forms.dll',
    "/out:$tempOutput"
  )
  if ($UseIcon -and (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
    $args += "/win32icon:$iconPath"
  }
  $args += $sourcePath

  $output = & $Compiler @args 2>&1
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $tempOutput -PathType Leaf)) {
    return [pscustomobject]@{ ok=$false; output=($output -join [Environment]::NewLine) }
  }
  return [pscustomobject]@{ ok=$true; output=($output -join [Environment]::NewLine) }
}

$compiler = Find-CSharpCompiler
$built = $false
$details = ''

if ($compiler) {
  Write-Host "Using C# compiler: $compiler"
  $result = Invoke-CscBuild -Compiler $compiler -UseIcon
  if (-not $result.ok -and (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
    Write-Warning 'Build with the custom icon failed. Retrying without the icon.'
    Remove-Item -LiteralPath $tempOutput -Force -ErrorAction SilentlyContinue
    $result = Invoke-CscBuild -Compiler $compiler
  }
  $built = $result.ok
  $details = $result.output
}

# Windows PowerShell 5.1 can compile a WindowsApplication directly with Add-Type.
# This fallback is useful on machines where csc.exe is not on PATH.
if (-not $built -and $PSVersionTable.PSEdition -eq 'Desktop') {
  try {
    Write-Host 'Trying Windows PowerShell Add-Type compiler fallback...'
    $source = Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8
    Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies @('System.dll','System.Windows.Forms.dll') -OutputAssembly $tempOutput -OutputType WindowsApplication
    $built = Test-Path -LiteralPath $tempOutput -PathType Leaf
  } catch {
    if ($details) { $details += [Environment]::NewLine }
    $details += $_.Exception.Message
  }
}

if (-not $built) {
  throw @"
Could not build kiosk.exe.

This build script works with the .NET Framework C# compiler included on most Windows 10/11 systems, or with Windows PowerShell 5.1 Add-Type.

If both are unavailable, enable/install .NET Framework 4.x or Visual Studio Build Tools, then run this script again.

Compiler output:
$details
"@
}

# Replace only after a complete build exists. The kiosk must be closed while rebuilding.
try {
  if (Test-Path -LiteralPath $outputPath -PathType Leaf) {
    Remove-Item -LiteralPath $outputPath -Force
  }
  Move-Item -LiteralPath $tempOutput -Destination $outputPath -Force
} catch {
  throw "The new launcher was built, but kiosk.exe could not be replaced. Close the kiosk first and run the build again. $($_.Exception.Message)"
}

Write-Host ''
Write-Host "Built successfully: $outputPath" -ForegroundColor Green
Write-Host 'You can now double-click kiosk.exe from the repository root.'
