# Batch Window Optimization Script
# Optimizes React components following WINDOW_OPTIMIZATION_GUIDE.md

Write-Host "Starting batch window optimization..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$optimizedCount = 0
$errorCount = 0

# Find all .tsx files in service folder with min-h-screen
$files = Get-ChildItem -Path "Frontend/src/service" -Recurse -Filter "*.tsx" | 
    Where-Object { 
        $content = Get-Content $_.FullName -Raw
        $content -match "min-h-screen.*gradient"
    }

Write-Host "Found $($files.Count) files to optimize" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    try {
        Write-Host "Processing: $($file.Name)" -ForegroundColor White
        
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # 1. Replace min-h-screen with gradients to h-screen flex flex-col overflow-auto
        $content = $content -replace 'min-h-screen bg-gradient-to-br from-[\w-]+ via-[\w-]+ to-[\w-]+ p-\d+', 'h-screen flex flex-col overflow-auto bg-slate-50'
        $content = $content -replace 'min-h-screen bg-gradient-to-br from-[\w-]+ via-[\w-]+ to-[\w-]+', 'h-screen flex flex-col overflow-auto bg-slate-50'
        
        # 2. Replace gradient backgrounds with solid colors
        $content = $content -replace 'bg-gradient-to-r from-blue-\d+ (via-blue-\d+ )?to-(blue|indigo)-\d+', 'bg-blue-600'
        $content = $content -replace 'bg-gradient-to-r from-green-\d+ (via-green-\d+ )?to-green-\d+', 'bg-green-600'
        $content = $content -replace 'bg-gradient-to-r from-gray-\d+ (via-gray-\d+ )?to-gray-\d+', 'bg-gray-600'
        $content = $content -replace 'bg-gradient-to-r from-slate-\d+ (via-slate-\d+ )?to-slate-\d+', 'bg-slate-600'
        $content = $content -replace 'bg-gradient-to-r from-red-\d+ (via-red-\d+ )?to-red-\d+', 'bg-red-600'
        $content = $content -replace 'bg-gradient-to-r from-teal-\d+ (via-teal-\d+ )?to-teal-\d+', 'bg-teal-600'
        $content = $content -replace 'bg-gradient-to-r from-purple-\d+ (via-purple-\d+ )?to-purple-\d+', 'bg-purple-600'
        $content = $content -replace 'bg-gradient-to-b from-slate-\d+ to-white', 'bg-white'
        $content = $content -replace 'bg-gradient-to-r from-purple-100 to-pink-100', 'bg-purple-50'
        
        # 3. Replace hover gradients
        $content = $content -replace 'hover:from-blue-\d+ hover:to-blue-\d+', 'hover:bg-blue-700'
        $content = $content -replace 'hover:from-green-\d+ hover:to-green-\d+', 'hover:bg-green-700'
        $content = $content -replace 'hover:from-gray-\d+ hover:to-gray-\d+', 'hover:bg-gray-700'
        $content = $content -replace 'hover:from-slate-\d+ hover:to-slate-\d+', 'hover:bg-slate-700'
        $content = $content -replace 'hover:from-red-\d+ hover:to-red-\d+', 'hover:bg-red-700'
        $content = $content -replace 'hover:from-teal-\d+ hover:to-teal-\d+', 'hover:bg-teal-700'
        $content = $content -replace 'hover:from-purple-\d+ hover:to-purple-\d+', 'hover:bg-purple-700'
        
        # 4. Simplify borders
        $content = $content -replace 'border-2 border-slate-300', 'border border-slate-200'
        $content = $content -replace 'border-2 border-slate-400', 'border border-slate-200'
        
        # 5. Replace shadows
        $content = $content -replace 'shadow-xl', 'shadow-lg'
        $content = $content -replace 'shadow-md', 'shadow-sm'
        
        # 6. Reduce padding
        $content = $content -replace '\bp-8\b', 'p-4'
        $content = $content -replace '\bp-6\b', 'p-3'
        $content = $content -replace '\bpx-8\b', 'px-5'
        $content = $content -replace '\bpy-8\b', 'py-4'
        $content = $content -replace '\bpx-6\b', 'px-4'
        $content = $content -replace '\bpy-6\b', 'py-3'
        
        # 7. Reduce margins and spacing
        $content = $content -replace '\bmb-8\b', 'mb-3'
        $content = $content -replace '\bmb-6\b', 'mb-3'
        $content = $content -replace '\bmt-8\b', 'mt-3'
        $content = $content -replace '\bmt-6\b', 'mt-3'
        $content = $content -replace '\bgap-6\b', 'gap-3'
        $content = $content -replace '\bgap-8\b', 'gap-4'
        $content = $content -replace '\bspace-y-8\b', 'space-y-3'
        $content = $content -replace '\bspace-y-6\b', 'space-y-3'
        $content = $content -replace '\bspace-y-5\b', 'space-y-3'
        $content = $content -replace '\bspace-x-6\b', 'gap-3'
        $content = $content -replace '\bspace-x-8\b', 'gap-4'
        
        # 8. Reduce button padding
        $content = $content -replace 'px-6 py-3', 'px-5 py-2'
        $content = $content -replace 'px-8 py-3', 'px-6 py-2'
        
        # Only save if content changed
        if ($content -ne $originalContent) {
            Set-Content $file.FullName $content -NoNewline
            Write-Host "  - Optimized" -ForegroundColor Green
            $optimizedCount++
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  - Error: $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Optimization Complete!" -ForegroundColor Cyan
Write-Host "Files optimized: $optimizedCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Errors: $errorCount" -ForegroundColor Red
} else {
    Write-Host "Errors: $errorCount" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan
