# build-launcher.ps1
# Compiles kiosk-launcher.cs into Kiosk.exe at the project root,
# then embeds favicon.ico losslessly via the Win32 UpdateResource API.
# Usage: .\bin\build-launcher.ps1  (run from project root or bin\)

$root = Split-Path $PSScriptRoot -Parent
$cs   = Join-Path $PSScriptRoot "kiosk-launcher.cs"
$ico  = Join-Path $PSScriptRoot "favicon.ico"
$out  = Join-Path $root "Kiosk.exe"
$csc  = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $cs))  { Write-Error "Not found: $cs";  exit 1 }
if (-not (Test-Path $ico)) { Write-Error "Not found: $ico"; exit 1 }
if (-not (Test-Path $csc)) { Write-Error "csc.exe not found at $csc"; exit 1 }

# ── Step 1: Compile (no icon — embedded properly in step 2) ───────────────────
$output = & $csc /target:winexe /out:$out /r:System.Windows.Forms.dll $cs 2>&1
$output | Where-Object { $_ -notmatch "^Microsoft|^for C#|^Copyright|^This compiler" }
if (-not (Test-Path $out) -or $LASTEXITCODE -ne 0) { Write-Error "Compile failed."; exit 1 }

# ── Step 2: Embed icon via Win32 UpdateResource ───────────────────────────────
# Copies every frame byte-for-byte from the .ico — no resampling, no quality loss.
Add-Type @'
using System; using System.Runtime.InteropServices;
public class KioskResUpdater {
    [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)]
    public static extern IntPtr BeginUpdateResource(string f, bool del);
    [DllImport("kernel32.dll",SetLastError=true)]
    public static extern bool UpdateResource(IntPtr h, IntPtr t, IntPtr n, ushort lang, byte[] d, uint cb);
    [DllImport("kernel32.dll",SetLastError=true)]
    public static extern bool EndUpdateResource(IntPtr h, bool discard);
    public static readonly IntPtr RT_ICON       = (IntPtr)3;
    public static readonly IntPtr RT_GROUP_ICON = (IntPtr)14;
}
'@

$b = [System.IO.File]::ReadAllBytes($ico)
$n = [BitConverter]::ToUInt16($b, 4)

$frames = for ($i = 0; $i -lt $n; $i++) {
    $o   = 6 + $i * 16
    $sz  = [BitConverter]::ToUInt32($b, $o + 8)
    $off = [BitConverter]::ToUInt32($b, $o + 12)
    $d   = [byte[]]::new($sz); [Array]::Copy($b, $off, $d, 0, $sz)
    [PSCustomObject]@{
        Id     = [uint16]($i + 1)
        W      = $b[$o];     H   = $b[$o + 1]
        CC     = $b[$o + 2]; Res = $b[$o + 3]
        Planes = [BitConverter]::ToUInt16($b, $o + 4)
        BC     = [BitConverter]::ToUInt16($b, $o + 6)
        Sz     = $sz;  Data = $d
    }
}

# Build GRPICONDIR blob
$gMs = New-Object System.IO.MemoryStream
$gBw = New-Object System.IO.BinaryWriter($gMs)
$gBw.Write([uint16]0); $gBw.Write([uint16]1); $gBw.Write([uint16]$n)
foreach ($f in $frames) {
    $gBw.Write([byte]$f.W);  $gBw.Write([byte]$f.H)
    $gBw.Write([byte]$f.CC); $gBw.Write([byte]$f.Res)
    $gBw.Write([uint16]$f.Planes); $gBw.Write([uint16]$f.BC)
    $gBw.Write([uint32]$f.Sz);     $gBw.Write([uint16]$f.Id)
}
$gBw.Flush()
$grp = $gMs.ToArray()

$h = [KioskResUpdater]::BeginUpdateResource($out, $false)
if ($h -eq [IntPtr]::Zero) {
    Write-Error "BeginUpdateResource failed (err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
    exit 1
}
foreach ($f in $frames) {
    if (-not [KioskResUpdater]::UpdateResource($h, [KioskResUpdater]::RT_ICON, [IntPtr]$f.Id, 0, $f.Data, [uint32]$f.Data.Length)) {
        [KioskResUpdater]::EndUpdateResource($h, $true) | Out-Null
        Write-Error "UpdateResource RT_ICON id=$($f.Id) failed"
        exit 1
    }
}
if (-not [KioskResUpdater]::UpdateResource($h, [KioskResUpdater]::RT_GROUP_ICON, [IntPtr]1, 0, $grp, [uint32]$grp.Length)) {
    [KioskResUpdater]::EndUpdateResource($h, $true) | Out-Null
    Write-Error "UpdateResource RT_GROUP_ICON failed"
    exit 1
}
[KioskResUpdater]::EndUpdateResource($h, $false) | Out-Null

Write-Host "Built: $out  ($((Get-Item $out).Length) bytes, $n icon frame(s))"
