[CmdletBinding()]
param(
  [string]$TaskName = "TechtangoRJS Local Backup",
  [int]$EveryMinutes = 30,
  [string]$ProjectRoot = "D:\Uday_Documents\00_TechtangoRJS",
  [string]$BackupScript = "D:\Uday_Documents\00_TechtangoRJS\scripts\backup-techtango.ps1"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($EveryMinutes -lt 1) {
  throw "EveryMinutes must be at least 1."
}

if (-not (Test-Path -LiteralPath $BackupScript)) {
  throw "Backup script not found: $BackupScript"
}

$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$scriptPath = (Resolve-Path -LiteralPath $BackupScript).Path
$workingDir = (Resolve-Path -LiteralPath $ProjectRoot).Path

$taskCommand = "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

Write-Host "[backup] Installing task '$TaskName' to run every $EveryMinutes minutes."
Write-Host "[backup] Command: $taskCommand"

$existing = schtasks /Query /TN $TaskName 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "[backup] Existing task found; removing it before recreation."
  schtasks /Delete /TN $TaskName /F | Out-Null
}

schtasks /Create `
  /TN $TaskName `
  /SC MINUTE `
  /MO $EveryMinutes `
  /TR $taskCommand `
  /RL LIMITED `
  /F | Out-Null

if ($LASTEXITCODE -ne 0) {
  throw "Failed to create scheduled task '$TaskName'."
}

Write-Host "[backup] Scheduled task created successfully."
Write-Host "[backup] Working directory: $workingDir"
Write-Host "[backup] Backup destination: D:\Backups\00_TechtangoRJS"
