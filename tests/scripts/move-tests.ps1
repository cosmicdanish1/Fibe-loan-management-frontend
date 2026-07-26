# PowerShell script to move tests from src/tests to tests directory

$sourceDir = "src/tests/unit"
$targetDir = "tests/unit"

# Ensure target directories exist
New-Item -ItemType Directory -Force -Path "$targetDir/components" | Out-Null
New-Item -ItemType Directory -Force -Path "$targetDir/pages" | Out-Null

# Copy all test files from src/tests/unit/components to tests/unit/components
Get-ChildItem -Path "$sourceDir/components" -Filter "*.test.tsx" | ForEach-Object {
    $targetPath = Join-Path -Path "$targetDir/components" -ChildPath $_.Name
    Write-Host "Moving $($_.FullName) to $targetPath"
    Copy-Item -Path $_.FullName -Destination $targetPath
    
    # Update import paths in the copied file
    $content = Get-Content -Path $targetPath
    $updatedContent = $content -replace "from '\.\.\.\/\.\.\.\/", "from '../../../src/"
    Set-Content -Path $targetPath -Value $updatedContent
}

# Copy all test files from src/tests/unit/pages to tests/unit/pages
New-Item -ItemType Directory -Force -Path "$targetDir/pages" | Out-Null
Get-ChildItem -Path "$sourceDir/pages" -Filter "*.test.tsx" | ForEach-Object {
    $targetPath = Join-Path -Path "$targetDir/pages" -ChildPath $_.Name
    Write-Host "Moving $($_.FullName) to $targetPath"
    Copy-Item -Path $_.FullName -Destination $targetPath
    
    # Update import paths in the copied file
    $content = Get-Content -Path $targetPath
    $updatedContent = $content -replace "from '\.\.\.\/\.\.\.\/", "from '../../../src/"
    Set-Content -Path $targetPath -Value $updatedContent
}

# Copy setupTests.ts if it doesn't exist in the target directory
if (-not (Test-Path "$targetDir/setupTests.ts")) {
    Copy-Item -Path "$sourceDir/setupTests.ts" -Destination "$targetDir/setupTests.ts"
}

# Copy unitTest.md to the target directory
Copy-Item -Path "$sourceDir/unitTest.md" -Destination "$targetDir/unitTest.md"

Write-Host "Test files have been moved and import paths updated."