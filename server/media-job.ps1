param(
  [Parameter(Mandatory=$true)][string]$RootPath,
  [Parameter(Mandatory=$true)][string]$JobPath
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($RootPath)
. (Join-Path $root 'server\media.ps1')
$cancelPath = [System.IO.Path]::ChangeExtension($JobPath, '.cancel')

function Write-KioskJobState {
  param($State)
  $State.updatedAt = [DateTime]::UtcNow.ToString('o')
  $json = $State | ConvertTo-Json -Depth 10
  $tmp = $JobPath + '.writing'
  [System.IO.File]::WriteAllText($tmp, $json, (New-Object System.Text.UTF8Encoding -ArgumentList $false))
  Move-Item -LiteralPath $tmp -Destination $JobPath -Force
}

function Add-KioskJobLog {
  param($State, [string]$Message)
  $entries = @($State.log)
  $entries += ('[{0}] {1}' -f (Get-Date).ToString('HH:mm:ss'), $Message)
  if ($entries.Count -gt 250) { $entries = @($entries | Select-Object -Last 250) }
  $State.log = $entries
}

$job = Get-Content -LiteralPath $JobPath -Raw -Encoding UTF8 | ConvertFrom-Json
$job.workerPid = $PID
$job.state = 'running'
$job.startedAt = [DateTime]::UtcNow.ToString('o')
$job.results = @($job.results)
$job.log = @($job.log)
Add-KioskJobLog -State $job -Message "Job started with profile '$($job.profile)'."
Write-KioskJobState -State $job

try {
  $files = @($job.files)
  for ($i = 0; $i -lt $files.Count; $i++) {
    if (Test-Path -LiteralPath $cancelPath) { throw (New-Object System.OperationCanceledException 'Processing cancelled.') }
    $src = [string]$files[$i]
    $job.current = $src
    $job.currentPercent = 0
    $job.completed = $i
    $job.overallPercent = 0
    if ($job.total -gt 0) { $job.overallPercent = [Math]::Round(($i / [double]$job.total) * 100, 1) }
    Add-KioskJobLog -State $job -Message "Analysing $src"
    Write-KioskJobState -State $job

    try {
      $analysis = Get-KioskVideoAnalysis -RootPath $root -Src $src
      Add-KioskJobLog -State $job -Message ("{0}: {1}" -f $analysis.status.ToUpperInvariant(), $analysis.reason)
      $progress = {
        param($pct)
        $job.currentPercent = [Math]::Round([double]$pct, 1)
        if ($job.total -gt 0) { $job.overallPercent = [Math]::Round((($i + ([double]$pct / 100.0)) / [double]$job.total) * 100, 1) }
        Write-KioskJobState -State $job
      }
      $cancel = { return (Test-Path -LiteralPath $cancelPath) }
      $result = Invoke-KioskProcessVideo -RootPath $root -Analysis $analysis -Profile ([string]$job.profile) -ProgressCallback $progress -CancelCheck $cancel
      $job.results = @($job.results) + @($result)
      if ($result.status -eq 'error') { Add-KioskJobLog -State $job -Message "ERROR $src - $($result.error)" }
      elseif ($result.status -eq 'ready') { Add-KioskJobLog -State $job -Message "READY $src - no changes required." }
      else { Add-KioskJobLog -State $job -Message ("DONE {0} -> {1}" -f $result.status.ToUpperInvariant(), $result.outputSrc) }
    } catch [System.OperationCanceledException] { throw }
    catch {
      $result = [pscustomobject]@{ src=$src; status='error'; action='none'; outputSrc=''; error=$_.Exception.Message }
      $job.results = @($job.results) + @($result)
      Add-KioskJobLog -State $job -Message "ERROR $src - $($_.Exception.Message)"
    }

    $job.completed = $i + 1
    $job.currentPercent = 100
    $job.overallPercent = 100
    if ($job.total -gt 0) { $job.overallPercent = [Math]::Round((($i + 1) / [double]$job.total) * 100, 1) }
    Write-KioskJobState -State $job
  }

  $job.current = ''
  $job.currentPercent = 100
  $job.overallPercent = 100
  $job.state = 'completed'
  $job.finishedAt = [DateTime]::UtcNow.ToString('o')
  Add-KioskJobLog -State $job -Message 'Job completed.'
  Write-KioskJobState -State $job
} catch [System.OperationCanceledException] {
  $job.state = 'cancelled'
  $job.current = ''
  $job.finishedAt = [DateTime]::UtcNow.ToString('o')
  Add-KioskJobLog -State $job -Message 'Job cancelled.'
  Write-KioskJobState -State $job
} catch {
  $job.state = 'failed'
  $job.current = ''
  $job.error = $_.Exception.Message
  $job.finishedAt = [DateTime]::UtcNow.ToString('o')
  Add-KioskJobLog -State $job -Message "JOB ERROR - $($_.Exception.Message)"
  Write-KioskJobState -State $job
} finally {
  Remove-Item -LiteralPath $cancelPath -Force -ErrorAction SilentlyContinue
}
