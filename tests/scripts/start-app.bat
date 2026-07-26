@echo off
REM =====================================================
REM Full Application Startup Script
REM =====================================================
REM Description: Starts both Backend and Frontend
REM Usage: Double-click this file or run from command line
REM =====================================================

title Loan Management System - Launcher

cls
echo.
echo ========================================
echo   LOAN MANAGEMENT SYSTEM
echo   Full Application Launcher
echo ========================================
echo.

REM Change to project root directory
cd /d "%~dp0"

echo [INFO] Starting application components...
echo.

REM Step 1: Start Backend
echo [STEP 1/2] Starting Backend Server...
echo.
start "Backend Server" cmd /k "cd backend && start-backend.bat"

echo [SUCCESS] Backend server starting in new window...
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Step 2: Start Frontend
echo.
echo [STEP 2/2] Starting Frontend Application...
echo.
start "Frontend App" cmd /k "cd Frontend && npm run dev"

echo [SUCCESS] Frontend application starting in new window...
echo.

REM Wait a moment
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   APPLICATION STARTED
echo ========================================
echo.
echo Backend Server: http://localhost:3000
echo API Documentation: http://localhost:3000/api/docs
echo.
echo Frontend App: http://localhost:5177
echo.
echo ========================================
echo.
echo Both components are starting in separate windows.
echo.
echo To stop the application:
echo   - Close both terminal windows
echo   - Or run: stop-app.bat
echo.
echo Press any key to exit this launcher...
pause >nul
