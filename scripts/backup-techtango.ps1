[CmdletBinding()]
param(
  [string]$ProjectRoot = "D:\Uday_Documents\00_TechtangoRJS",
  [string]$BackupRoot = "D:\Backups\00_TechtangoRJS",
  [int]$KeepBackups = 10
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Log {
  param([string]$Message)
  $line = "[{0}] [backup] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  if ($script:LogPath) {
    Add-Content -LiteralPath $script:LogPath -Value $line
  }
}

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw "Project root not found: $ProjectRoot"
}

$null = New-Item -ItemType Directory -Force -Path $BackupRoot
$logRoot = Join-Path $BackupRoot "logs"
$null = New-Item -ItemType Directory -Force -Path $logRoot

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$zipName = "00_TechtangoRJS-$timestamp.zip"
$zipPath = Join-Path $BackupRoot $zipName
$script:LogPath = Join-Path $logRoot "backup-$timestamp.log"
$stageRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("00_TechtangoRJS-backup-" + [Guid]::NewGuid().ToString("N"))

$excludeDirs = @(
  "node_modules",
  ".git",
  "build",
  "dist",
  "coverage",
  ".cache",
  ".next"
)

$excludeFiles = @(
  "*.log",
  "*.zip",
  "*.tmp",
  "*.swp"
)

try {
  Set-Content -LiteralPath $script:LogPath -Value ("[{0}] [backup] Starting backup run." -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
  Write-Log "Preparing staging folder: $stageRoot"
  $null = New-Item -ItemType Directory -Force -Path $stageRoot

  Write-Log "Copying project files from $ProjectRoot"
  $robocopyArgs = @(
    $ProjectRoot,
    $stageRoot,
    "/MIR",
    "/R:1",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP",
    "/XD"
  ) + $excludeDirs + @("/XF") + $excludeFiles

  & robocopy @robocopyArgs | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed with exit code $LASTEXITCODE."
  }

  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  Write-Log "Creating zip archive: $zipPath"
  Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal

  Write-Log "Keeping only the newest $KeepBackups backup zip files"
  Get-ChildItem -LiteralPath $BackupRoot -Filter "*.zip" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip ([Math]::Abs($KeepBackups)) |
    Remove-Item -Force -ErrorAction SilentlyContinue

  Write-Log "Backup completed: $zipPath"
}
finally {
  if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  if ($script:LogPath) {
    Write-Log "Log saved to $script:LogPath"
  }
}
