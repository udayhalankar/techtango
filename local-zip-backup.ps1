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
#   Latest 20 ZIP backups
#
# IMPORTANT:
# - Source files are READ ONLY.
# - No Git commit/push/pull/reset/clean/restore is performed.
# - Only old ZIP files in the backup directory are deleted.
# ============================================================

$RepoPath   = "D:\Uday_Documents\00_TechtangoRJS"
$BackupPath = "D:\Backups\00_TechtangoRJS"
$KeepCopies = 20

# ------------------------------------------------------------
# Create backup destination if it does not exist
# ------------------------------------------------------------

if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}

$LogFile = Join-Path $BackupPath "local-backup.log"

function Write-BackupLog {
    param([string]$Message)

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    "$Timestamp  $Message" |
        Tee-Object -FilePath $LogFile -Append
}

Write-BackupLog "============================================================"
Write-BackupLog "Local ZIP backup started."

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
    # Generate backup filename
    # Example:
    # TechtangoRJS_2026-08-21_235500.zip
    # --------------------------------------------------------

    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $ZipName   = "TechtangoRJS_$Timestamp.zip"
    $ZipPath   = Join-Path $BackupPath $ZipName

    Write-BackupLog "Source: $RepoPath"
    Write-BackupLog "Target: $ZipPath"

    # --------------------------------------------------------
    # Obtain EXACT Git-visible file inventory
    #
    # -c = cached/tracked
    # -o = other/untracked
    # --exclude-standard = respect .gitignore
    #
    # This closely mirrors the files considered by:
    #
    #     git add -A
    #
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
    # Create ZIP directly from repository files
    #
    # No temporary copy of the project is created.
    # --------------------------------------------------------

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $ZipStream = $null
    $Archive   = $null

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

        $Added = 0

        foreach ($RelativeFile in $Files) {

            $SourceFile = Join-Path $RepoPath $RelativeFile

            if (!(Test-Path $SourceFile -PathType Leaf)) {
                continue
            }

            # ZIP paths should use forward slashes
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
    # Validate ZIP
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
    # Retention
    #
    # Keep newest 20 copies.
    # Delete ONLY TechtangoRJS_*.zip files from BackupPath.
    # --------------------------------------------------------

    $ExistingBackups = @(
        Get-ChildItem `
            -Path $BackupPath `
            -Filter "TechtangoRJS_*.zip" `
            -File |
        Sort-Object LastWriteTime -Descending
    )

    Write-BackupLog "Backup copies before retention: $($ExistingBackups.Count)"

    if ($ExistingBackups.Count -gt $KeepCopies) {

        $OldBackups = $ExistingBackups |
            Select-Object -Skip $KeepCopies

        foreach ($OldBackup in $OldBackups) {

            Write-BackupLog "Removing old backup: $($OldBackup.Name)"

            Remove-Item `
                -LiteralPath $OldBackup.FullName `
                -Force
        }
    }

    $Remaining = @(
        Get-ChildItem `
            -Path $BackupPath `
            -Filter "TechtangoRJS_*.zip" `
            -File
    )

    Write-BackupLog "Backup copies retained: $($Remaining.Count)"
    Write-BackupLog "LOCAL BACKUP SUCCESSFUL."
}
catch {

    Write-BackupLog "LOCAL BACKUP FAILED: $($_.Exception.Message)"

    # Remove incomplete ZIP from this run, if one exists.
    if ($ZipPath -and (Test-Path $ZipPath)) {

        try {
            Remove-Item -LiteralPath $ZipPath -Force
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