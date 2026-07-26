@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.

cd backend

echo Checking if node_modules exists...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting NestJS backend on port 3001...
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

call npm run start:dev

pause
