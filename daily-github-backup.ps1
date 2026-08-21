# ============================================================
# Techtango Daily GitHub Backup
# Runs daily via Windows Task Scheduler
# Does NOT pull, merge, reset, restore, clean, or delete files.
# ============================================================

$RepoPath   = "D:\Uday_Documents\00_TechtangoRJS"
$BackupBranch = "daily-backup"
$LogDir     = Join-Path $RepoPath "backup-logs"
$LogFile    = Join-Path $LogDir "github-backup.log"

# Create log folder if required
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-BackupLog {
    param([string]$Message)

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp  $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-BackupLog "============================================================"
Write-BackupLog "Daily GitHub backup started."

try {

    Set-Location $RepoPath

    Write-BackupLog "Repository: $RepoPath"

    # Confirm this is a Git repository
    git rev-parse --is-inside-work-tree *> $null

    if ($LASTEXITCODE -ne 0) {
        throw "The configured folder is not a valid Git repository."
    }

    $CurrentBranch = git branch --show-current
    $CurrentCommit = git rev-parse HEAD

    Write-BackupLog "Current branch: $CurrentBranch"
    Write-BackupLog "Current HEAD: $CurrentCommit"

    # --------------------------------------------------------
    # Stage EVERYTHING currently changed/untracked
    # --------------------------------------------------------

    Write-BackupLog "Staging current project state..."

    git add -A

    if ($LASTEXITCODE -ne 0) {
        throw "git add -A failed."
    }

    # --------------------------------------------------------
    # Commit only when staged changes exist
    # --------------------------------------------------------

    git diff --cached --quiet

    if ($LASTEXITCODE -eq 0) {

        Write-BackupLog "No new file changes found. No commit required."

    }
    else {

        $CommitTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "Daily backup $CommitTime"

        Write-BackupLog "Creating commit: $CommitMessage"

        git commit -m "$CommitMessage"

        if ($LASTEXITCODE -ne 0) {
            throw "Git commit failed."
        }

        $CurrentCommit = git rev-parse HEAD
        Write-BackupLog "Created commit: $CurrentCommit"
    }

    # --------------------------------------------------------
    # Push current HEAD to dedicated backup branch
    #
    # This does NOT switch local branches.
    # --------------------------------------------------------

    Write-BackupLog "Pushing HEAD to origin/$BackupBranch..."

    git push origin "HEAD:$BackupBranch"

    if ($LASTEXITCODE -ne 0) {
        throw "GitHub push failed."
    }

    $CurrentCommit = git rev-parse HEAD

    Write-BackupLog "BACKUP SUCCESSFUL."
    Write-BackupLog "GitHub branch: $BackupBranch"
    Write-BackupLog "Backed-up commit: $CurrentCommit"

}
catch {

    Write-BackupLog "BACKUP FAILED: $($_.Exception.Message)"
    exit 1
}

Write-BackupLog "Daily GitHub backup completed."
Write-BackupLog "============================================================"

exit 0