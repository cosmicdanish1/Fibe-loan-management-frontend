# PowerShell script to clean up src/tests directory after migration

# Backup the src/tests directory before removing it
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "src/tests_backup_$timestamp"

Write-Host "Backing up src/tests to $backupDir"
Copy-Item -Path "src/tests" -Destination $backupDir -Recurse

# Remove the src/tests directory
Write-Host "Removing src/tests directory"
Remove-Item -Path "src/tests" -Recurse -Force

Write-Host "Cleanup complete. A backup of the src/tests directory has been created at $backupDir"