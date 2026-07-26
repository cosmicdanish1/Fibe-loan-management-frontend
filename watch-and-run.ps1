param(
    [switch]$BuildOnly,
    [switch]$RunOnly
)

# Always run from the Frontend folder so npm finds the right node_modules
Set-Location $PSScriptRoot

function Show-Banner {
    $bannerPath = Join-Path -Path $PSScriptRoot -ChildPath "src\assets\banner.txt"
    if (-not (Test-Path $bannerPath)) {
        Write-Host "[ERROR] Banner file not found: $bannerPath" -ForegroundColor Red
        return
    }

    $bannerLines = Get-Content $bannerPath

    $w = 62
  

    foreach ($line in $bannerLines) {
        Write-Host $line -ForegroundColor DarkYellow
    }

    $subtitle1 = "Electron App Watcher and Runner"
    $subtitle2 = "Smart development tool (build, watch, restart)"

    $pad1 = " " * [math]::Floor(($w - $subtitle1.Length)/2)
    $pad2 = " " * [math]::Floor(($w - $subtitle2.Length)/2)

    Write-Host ""
    Write-Host ($pad1 + $subtitle1) -ForegroundColor DarkYellow
    Write-Host ($pad2 + $subtitle2) -ForegroundColor DarkYellow


    Write-Host ""
}

function Build-App {
    Write-Host "[INFO] Building app..." -ForegroundColor Yellow

    Write-Host "  - Building React app (Vite)..." -ForegroundColor Cyan
    # Call vite.cmd directly — avoids PowerShell 5.1 PATH inheritance issues with npm scripts
    & ".\node_modules\.bin\vite.cmd" build
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Vite build failed" -ForegroundColor Red; return $false }

    Write-Host "  - Building Electron main process..." -ForegroundColor Cyan
    cmd /c "npm run build:electron"
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Electron build failed" -ForegroundColor Red; return $false }

    Write-Host "[OK] Build completed successfully" -ForegroundColor Green
    return $true
}

function Run-App {
    Write-Host "[INFO] Starting application..." -ForegroundColor Yellow

    # Detect which backend is reachable (localhost or LAN IP) and update server-config.json
    Write-Host "  - Detecting backend..." -ForegroundColor Cyan
    node scripts/wait-for-backend.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Backend not reachable on port 3001. Start the backend first." -ForegroundColor Red
        return
    }

    Write-Host "  - Starting Vite dev server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-Command", "npm run dev:vite" -WindowStyle Minimized

    Write-Host "  - Waiting for Vite server to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3

    Write-Host "  - Starting Electron..." -ForegroundColor Cyan
    npm run dev:electron
}

function Watch-And-Rebuild {
    $w = 62
    Write-Host "[INFO] Watcher mode active" -ForegroundColor Yellow
    Write-Host ("-" * $w) -ForegroundColor DarkGray
    Write-Host ("|" + (" " * [math]::Floor(($w - 2 - 27) / 2)) + "Watching 'src' for changes" + (" " * [math]::Ceiling(($w - 2 - 27) / 2)) + "|") -ForegroundColor Gray
    Write-Host ("|" + (" " * [math]::Floor(($w - 2 - 41) / 2)) + "Press 'r' to restart Electron, 'q' to quit" + (" " * [math]::Ceiling(($w - 2 - 41) / 2)) + "|") -ForegroundColor Gray
    Write-Host ("-" * $w) -ForegroundColor DarkGray

    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = "src"
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true

    $job = Register-ObjectEvent $watcher "Changed" -Action {
        $file = $Event.SourceEventArgs.Name
        if ($file -match "\.tmp$|\.log$|node_modules|\.git") { return }

        Write-Host "[CHANGE] $file" -ForegroundColor Magenta
        Write-Host "[INFO] Rebuilding..." -ForegroundColor Yellow
        & ".\node_modules\.bin\vite.cmd" build
        cmd /c "npm run build:electron"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Rebuild complete. Press 'r' to restart Electron." -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Rebuild failed. See errors above." -ForegroundColor Red
        }
    }

    try {
        while ($true) {
            $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            if ($key.Character -eq 'r') {
                Write-Host "[INFO] Restarting Electron..." -ForegroundColor Yellow
                Get-Process | Where-Object { $_.ProcessName -eq "electron" } | Stop-Process -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
                npm run dev:electron
            } elseif ($key.Character -eq 'q') {
                Write-Host "[INFO] Stopping watcher..." -ForegroundColor Yellow
                break
            }
        }
    } finally {
        if ($job) { Unregister-Event $job.Id }
        $watcher.EnableRaisingEvents = $false
        $watcher.Dispose()
        Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

# Main
Show-Banner

if ($BuildOnly) {
    Build-App | Out-Null
    exit $LASTEXITCODE
} elseif ($RunOnly) {
    Run-App
    exit $LASTEXITCODE
} else {
    if (Build-App) {
        $w = 62
        Write-Host ("=" * $w) -ForegroundColor DarkCyan
        Write-Host ("|" + (" " * [math]::Floor(($w - 2 - 13) / 2)) + "Choose an option" + (" " * [math]::Ceiling(($w - 2 - 13) / 2)) + "|") -ForegroundColor Cyan
        Write-Host ("-" * $w) -ForegroundColor DarkCyan
        Write-Host "  [1] Run app once" -ForegroundColor Gray
        Write-Host "  [2] Watch and auto-rebuild (recommended)" -ForegroundColor Gray
        $choice = Read-Host "Enter choice (1 or 2)"
        if ($choice -eq "1") {
            Run-App
        } elseif ($choice -eq "2") {
            Run-App
            Start-Sleep -Seconds 2
            Watch-And-Rebuild
        } else {
            Write-Host "[ERROR] Invalid choice" -ForegroundColor Red
        }
    }
}

Write-Host ""; Write-Host "[DONE] Script completed" -ForegroundColor Green; Write-Host ""
