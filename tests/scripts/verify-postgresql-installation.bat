@echo off
echo ========================================
echo PostgreSQL Client Tools Verification
echo ========================================
echo.

echo Checking if PostgreSQL client tools are installed...
echo.

echo 1. Testing pg_dump...
pg_dump --version 2>nul
if %errorlevel% equ 0 (
    echo    ✅ pg_dump is available
) else (
    echo    ❌ pg_dump not found
)

echo.
echo 2. Testing psql...
psql --version 2>nul
if %errorlevel% equ 0 (
    echo    ✅ psql is available
) else (
    echo    ❌ psql not found
)

echo.
echo 3. Checking PATH for PostgreSQL...
echo %PATH% | findstr /i "postgresql" >nul
if %errorlevel% equ 0 (
    echo    ✅ PostgreSQL found in PATH
) else (
    echo    ❌ PostgreSQL not found in PATH
)

echo.
echo 4. Testing database connection...
echo    Testing connection to EMP_Espat_Society database...
set PGPASSWORD=Test@1212
psql -h localhost -p 5432 -U postgres -d EMP_Espat_Society -c "SELECT version();" 2>nul
if %errorlevel% equ 0 (
    echo    ✅ Database connection successful
) else (
    echo    ❌ Database connection failed
)

echo.
echo ========================================
echo Verification Complete
echo ========================================
echo.

if exist "C:\Program Files\PostgreSQL" (
    echo PostgreSQL installation found at: C:\Program Files\PostgreSQL
    dir "C:\Program Files\PostgreSQL" /b
) else (
    echo No PostgreSQL installation found in default location
)

echo.
echo If you see ❌ marks above, please install PostgreSQL client tools:
echo 1. Download from: https://www.postgresql.org/download/windows/
echo 2. During installation, ensure "Command Line Tools" is selected
echo 3. Add PostgreSQL bin folder to your system PATH
echo 4. Restart your application
echo.
pause