# PowerShell script to optimize React components following WINDOW_OPTIMIZATION_GUIDE.md

$componentsToOptimize = @(
    "Frontend/src/service/Utility/PrematureInformationSB/page/PrematureInformationSB.tsx",
    "Frontend/src/service/Utility/MemberBalance/page/MemberBalance.tsx",
    "Frontend/src/service/Utility/Find/page/Find.tsx",
    "Frontend/src/service/Utility/InterestReceivableReceivedStatement/page/InterestReceivableReceivedStatement.tsx"
)

foreach ($file in $componentsToOptimize) {
    if (Test-Path $file) {
        Write-Host "Optimizing: $file"
        
        $content = Get-Content $file -Raw
        
        # Replace min-h-screen with gradients to h-screen flex flex-col overflow-auto
        $content = $content -replace 'min-h-screen bg-gradient-to-br from-[^\s]+ via-[^\s]+ to-[^\s]+ p-\d+', 'h-screen flex flex-col overflow-auto bg-slate-50'
        $content = $content -replace 'min-h-screen bg-gradient-to-br from-[^\s]+ via-[^\s]+ to-[^\s]+', 'h-screen flex flex-col overflow-auto bg-slate-50'
        
        # Replace gradient backgrounds
        $content = $content -replace 'bg-gradient-to-r from-blue-\d+ (via-blue-\d+ )?to-(blue|indigo)-\d+', 'bg-blue-600'
        $content = $content -replace 'bg-gradient-to-b from-slate-\d+ to-white', 'bg-white'
        
        # Replace border-2 with border
        $content = $content -replace 'border-2 border-slate-300', 'border border-slate-200'
        
        # Replace shadow-xl with shadow-lg
        $content = $content -replace 'shadow-xl', 'shadow-lg'
        
        # Reduce padding
        $content = $content -replace ' p-8 ', ' p-4 '
        $content = $content -replace ' p-6 ', ' p-3 '
        $content = $content -replace ' mb-8 ', ' mb-3 '
        $content = $content -replace ' mb-6 ', ' mb-3 '
        $content = $content -replace ' gap-6 ', ' gap-3 '
        $content = $content -replace ' space-y-6 ', ' space-y-3 '
        
        Set-Content $file $content
        Write-Host "✓ Optimized: $file"
    } else {
        Write-Host "✗ File not found: $file"
    }
}

Write-Host "`nOptimization complete!"
