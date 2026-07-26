@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set WIDTH=62

if exist assets\banner.txt (
  type assets\banner.txt
  echo.
) else (
  echo.
  REM Removed border lines
  echo.
)

echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo PowerShell is not available on this system.
    echo Please run the PowerShell script directly: watch-and-run.ps1
    pause
    exit /b 1
)

REM Change to the script's own directory so watch-and-run.ps1 is always found
cd /d "%~dp0"

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0watch-and-run.ps1"

echo.
echo DONE. Script completed!
pause
exit /b 0

:center
set "text=%~1"
call :strlen "%text%"
set /a pad=(%WIDTH%-2-%strlen%) / 2
set /a pad2=(%WIDTH%-2-%strlen%) - !pad!
set "sp1="
for /l %%i in (1,1,!pad!) do set "sp1=!sp1! "
set "sp2="
for /l %%i in (1,1,!pad2!) do set "sp2=!sp2! "
echo ^|!sp1!!text!!sp2!^|
exit /b 0

:strlen
set "s=%~1"
set /a strlen=0
:strlen_loop
if defined s if not "!s:~%strlen%,1!"=="" set /a strlen+=1 & goto :strlen_loop
exit /b 0
