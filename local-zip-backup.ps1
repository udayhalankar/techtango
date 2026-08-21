# ============================================================
# Techtango Local ZIP Backup
#
# Source:
#   D:\Uday_Documents\00_TechtangoRJS
#
# Destination:
#   D:\Backups\00_TechtangoRJS
#
# Schedule:
#   Every 30 minutes
#
# Retention:
#   - Keep latest 20 rolling full ZIP backups
#   - Preserve the latest successful backup from each previous day
#     in a separate DAILY archive folder
#
# IMPORTANT:
# - Source files are READ ONLY.
# - No Git commit/push/pull/reset/clean/restore is performed.
# - Only old ZIP files in the rolling backup folder are deleted.
# ============================================================

$RepoPath         = "D:\Uday_Documents\00_TechtangoRJS"
$BackupRoot       = "D:\Backups\00_TechtangoRJS"
$RollingBackupDir = Join-Path $BackupRoot "rolling"
$DailyBackupDir   = Join-Path $BackupRoot "daily"

$KeepCopies = 20

# ------------------------------------------------------------
# Create backup folders
# ------------------------------------------------------------

foreach ($Path in @($BackupRoot, $RollingBackupDir, $DailyBackupDir)) {

    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

$LogFile = Join-Path $BackupRoot "local-backup.log"

function Write-BackupLog {

    param([string]$Message)

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    "$Timestamp  $Message" |
        Tee-Object -FilePath $LogFile -Append
}

Write-BackupLog "============================================================"
Write-BackupLog "Local ZIP backup started."

$ZipPath = $null

try {

    # --------------------------------------------------------
    # Validate source
    # --------------------------------------------------------

    if (!(Test-Path $RepoPath)) {
        throw "Source repository does not exist: $RepoPath"
    }

    Set-Location $RepoPath

    git rev-parse --is-inside-work-tree *> $null

    if ($LASTEXITCODE -ne 0) {
        throw "Source folder is not a valid Git repository."
    }

    # --------------------------------------------------------
    # Generate full backup filename
    # --------------------------------------------------------

    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

    $ZipName = "TechtangoRJS_$Timestamp.zip"

    $ZipPath = Join-Path $RollingBackupDir $ZipName

    Write-BackupLog "Source: $RepoPath"
    Write-BackupLog "Target: $ZipPath"

    # --------------------------------------------------------
    # Get the same file universe considered by Git backup:
    #
    # tracked files
    # +
    # untracked files
    # -
    # ignored files
    #
    # Equivalent in scope to what git add -A would see,
    # without actually staging anything.
    # --------------------------------------------------------

    $Files = @(git ls-files -co --exclude-standard)

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to obtain Git file inventory."
    }

    $Files = @(
        $Files |
            Where-Object {
                $_ -and
                (Test-Path (Join-Path $RepoPath $_) -PathType Leaf)
            } |
            Sort-Object -Unique
    )

    if ($Files.Count -eq 0) {
        throw "Git returned no files to back up."
    }

    Write-BackupLog "Files to backup: $($Files.Count)"

    # --------------------------------------------------------
    # Create full ZIP
    # --------------------------------------------------------

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $ZipStream = $null
    $Archive   = $null
    $Added     = 0

    try {

        $ZipStream = [System.IO.File]::Open(
            $ZipPath,
            [System.IO.FileMode]::CreateNew,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )

        $Archive = New-Object System.IO.Compression.ZipArchive(
            $ZipStream,
            [System.IO.Compression.ZipArchiveMode]::Create,
            $false
        )

        foreach ($RelativeFile in $Files) {

            $SourceFile = Join-Path $RepoPath $RelativeFile

            if (!(Test-Path $SourceFile -PathType Leaf)) {
                continue
            }

            $EntryName = $RelativeFile.Replace("\", "/")

            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $Archive,
                $SourceFile,
                $EntryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null

            $Added++
        }
    }
    finally {

        if ($Archive) {
            $Archive.Dispose()
        }

        if ($ZipStream) {
            $ZipStream.Dispose()
        }
    }

    # --------------------------------------------------------
    # Validate created ZIP
    # --------------------------------------------------------

    if (!(Test-Path $ZipPath)) {
        throw "ZIP file was not created."
    }

    $ZipInfo = Get-Item $ZipPath

    if ($ZipInfo.Length -le 0) {
        throw "Created ZIP is empty."
    }

    Write-BackupLog "ZIP created successfully."
    Write-BackupLog "Files added: $Added"
    Write-BackupLog "ZIP size: $([math]::Round($ZipInfo.Length / 1MB, 2)) MB"

    # --------------------------------------------------------
    # DAILY ARCHIVE
    #
    # Preserve the latest backup from every previous calendar
    # day before rolling retention removes old ZIPs.
    #
    # Example:
    # If yesterday had backups at:
    # 22:45
    # 23:15
    # 23:45
    #
    # then 23:45 becomes:
    #
    # TechtangoRJS_DAILY_2026-08-20.zip
    # --------------------------------------------------------

    $Today = (Get-Date).Date

    $RollingBackups = @(
        Get-ChildItem `
            -Path $RollingBackupDir `
            -Filter "TechtangoRJS_*.zip" `
            -File |
            Sort-Object LastWriteTime -Descending
    )

    $PreviousDayGroups = @(
        $RollingBackups |
            Where-Object {
                $_.LastWriteTime.Date -lt $Today
            } |
            Group-Object {
                $_.LastWriteTime.ToString("yyyy-MM-dd")
            }
    )

    foreach ($DayGroup in $PreviousDayGroups) {

        $LatestForDay = $DayGroup.Group |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if (!$LatestForDay) {
            continue
        }

        $DayStamp = $LatestForDay.LastWriteTime.ToString("yyyy-MM-dd")

        $DailyName = "TechtangoRJS_DAILY_$DayStamp.zip"

        $DailyPath = Join-Path $DailyBackupDir $DailyName

        if (!(Test-Path $DailyPath)) {

            Copy-Item `
                -LiteralPath $LatestForDay.FullName `
                -Destination $DailyPath

            Write-BackupLog "Daily archive created: $DailyName"
        }
    }

    # --------------------------------------------------------
    # ROLLING RETENTION
    #
    # Keep latest 20 rolling ZIPs only.
    #
    # DAILY archive ZIPs are NEVER touched here.
    # --------------------------------------------------------

    $ExistingBackups = @(
        Get-ChildItem `
            -Path $RollingBackupDir `
            -Filter "TechtangoRJS_*.zip" `
            -File |
            Sort-Object LastWriteTime -Descending
    )

    Write-BackupLog "Rolling copies before retention: $($ExistingBackups.Count)"

    if ($ExistingBackups.Count -gt $KeepCopies) {

        $OldBackups = @(
            $ExistingBackups |
                Select-Object -Skip $KeepCopies
        )

        foreach ($OldBackup in $OldBackups) {

            Write-BackupLog "Removing old rolling backup: $($OldBackup.Name)"

            Remove-Item `
                -LiteralPath $OldBackup.FullName `
                -Force
        }
    }

    # --------------------------------------------------------
    # Final backup counts
    # --------------------------------------------------------

    $RollingRemaining = @(
        Get-ChildItem `
            -Path $RollingBackupDir `
            -Filter "TechtangoRJS_*.zip" `
            -File
    )

    $DailyRemaining = @(
        Get-ChildItem `
            -Path $DailyBackupDir `
            -Filter "TechtangoRJS_DAILY_*.zip" `
            -File
    )

    Write-BackupLog "Rolling copies retained: $($RollingRemaining.Count)"
    Write-BackupLog "Daily archive copies retained: $($DailyRemaining.Count)"

    Write-BackupLog "LOCAL BACKUP SUCCESSFUL."
}
catch {

    Write-BackupLog "LOCAL BACKUP FAILED: $($_.Exception.Message)"

    # --------------------------------------------------------
    # Remove only incomplete ZIP from CURRENT run
    # --------------------------------------------------------

    if ($ZipPath -and (Test-Path $ZipPath)) {

        try {

            Remove-Item `
                -LiteralPath $ZipPath `
                -Force

            Write-BackupLog "Incomplete ZIP removed."
        }
        catch {

            Write-BackupLog "WARNING: Could not remove incomplete ZIP."
        }
    }

    exit 1
}

Write-BackupLog "Local ZIP backup completed."
Write-BackupLog "============================================================"

exit 0