# PowerShell script to fix import paths in test files

$testDir = "tests/unit"

# Get all test files
$testFiles = Get-ChildItem -Path $testDir -Recurse -Filter "*.test.tsx"

foreach ($file in $testFiles) {
    Write-Host "Fixing import paths in $($file.FullName)"
    
    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Replace import paths
    # Pattern 1: from '../../../components/...' to from '../../../src/components/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/components\/", "from '../../../src/components/"
    
    # Pattern 2: from '../../../pages/...' to from '../../../src/pages/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/pages\/", "from '../../../src/pages/"
    
    # Pattern 3: from '../../../renderer/...' to from '../../../src/renderer/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/renderer\/", "from '../../../src/renderer/"
    
    # Pattern 4: from '../../../service/...' to from '../../../src/service/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/service\/", "from '../../../src/service/"
    
    # Pattern 5: from '../../../utils/...' to from '../../../src/utils/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/utils\/", "from '../../../src/utils/"
    
    # Pattern 6: from '../../../auth/...' to from '../../../src/auth/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/auth\/", "from '../../../src/auth/"
    
    # Pattern 7: from '../../../backend/...' to from '../../../src/backend/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/backend\/", "from '../../../src/backend/"
    
    # Pattern 8: from '../../../features/...' to from '../../../src/features/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/features\/", "from '../../../src/features/"
    
    # Pattern 9: from '../../../layouts/...' to from '../../../src/layouts/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/layouts\/", "from '../../../src/layouts/"
    
    # Pattern 10: from '../../../navigation/...' to from '../../../src/navigation/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/navigation\/", "from '../../../src/navigation/"
    
    # Pattern 11: from '../../../interface/...' to from '../../../src/interface/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/interface\/", "from '../../../src/interface/"
    
    # Pattern 12: from '../../../types/...' to from '../../../src/types/...'
    $content = $content -replace "from '\.\.\.\/\.\.\.\/\.\.\.\/types\/", "from '../../../src/types/"
    
    # Write the updated content back to the file
    Set-Content -Path $file.FullName -Value $content
}

Write-Host "Import paths have been fixed in all test files."