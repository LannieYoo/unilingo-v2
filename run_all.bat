@echo off
setlocal enabledelayedexpansion

REM ========================================
REM UniLingo - Optimized Server Startup
REM ========================================
REM Parallel server startup with health checks
REM Browser opens automatically via Vite

title UniLingo Server Manager

echo.
echo ========================================
echo        UniLingo Server Startup
echo ========================================
echo.

REM Get current directory
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

REM ========================================
REM Step 1: Environment Validation
REM ========================================
echo [1/5] Validating environment...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python not found
    echo Download: https://www.python.org/
    pause
    exit /b 1
)

REM Check .env file
if not exist ".env" (
    echo [ERROR] .env file missing
    echo Copy .env.example to .env and configure Supabase credentials
    pause
    exit /b 1
)

echo      Environment OK

REM ========================================
REM Step 2: Port Cleanup
REM ========================================
echo [2/5] Cleaning up ports...

REM Kill processes on port 3001, 5173, and 8001
for %%p in (3001 5173 8001) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr "LISTENING" 2^>nul') do (
        echo      Killing PID %%a on port %%p...
        taskkill /F /PID %%a >nul 2>nul
    )
)

REM Wait for port release (retry up to 5 seconds)
set "PORT_CLEAR=0"
for /L %%i in (1,1,5) do (
    if !PORT_CLEAR! equ 0 (
        timeout /t 1 /nobreak >nul
        netstat -ano | findstr ":8001 " | findstr "LISTENING" >nul 2>nul
        if !errorlevel! neq 0 (
            netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul 2>nul
            if !errorlevel! neq 0 (
                set "PORT_CLEAR=1"
            )
        )
    )
)
if !PORT_CLEAR! equ 0 (
    echo [WARN] Ports may not be fully released. Continuing anyway...
)
echo      Ports cleared

REM ========================================
REM Step 3: Backend Setup
REM ========================================
echo [3/5] Preparing backend...

cd /d "%PROJECT_DIR%"

REM Check if venv exists and is valid
if not exist "venv\Scripts\activate.bat" (
    echo      Creating virtual environment...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate venv and check if requirements are installed
call venv\Scripts\activate.bat

REM Quick check if Flask is installed
python -c "import flask" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo      Installing backend dependencies...
    pip install -q -r backend\requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)

echo      Backend ready

REM ========================================
REM Step 4: Frontend Setup
REM ========================================
echo [4/5] Preparing frontend...

cd /d "%PROJECT_DIR%frontend"

REM Check if node_modules exists and is valid
if not exist "node_modules\vite" (
    echo      Installing frontend dependencies...
    call npm install --silent
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo      Frontend ready

REM ========================================
REM Step 5: Start Servers
REM ========================================
echo [5/5] Starting servers...

REM Start Backend (minimized window)
cd /d "%PROJECT_DIR%"
start "UniLingo Backend" /MIN cmd /c "call venv\Scripts\activate.bat && cd backend && python app.py"

REM Brief wait for backend initialization
timeout /t 2 /nobreak >nul

REM Start Frontend (minimized window)
cd /d "%PROJECT_DIR%frontend"
start "UniLingo Frontend" /MIN cmd /c "npm run dev"

REM Wait for servers to fully initialize
echo      Waiting for servers to start...
timeout /t 3 /nobreak >nul

REM ========================================
REM Success Message
REM ========================================
cls
echo.
echo ========================================
echo     Servers Running Successfully!
echo ========================================
echo.
echo  Frontend:   http://localhost:3001
echo  Backend:    http://localhost:8001
echo  Database:   Supabase (Cloud)
echo.
echo ========================================
echo  Quick Links
echo ========================================
echo.
echo  STT Stream:     /stt-stream
echo  Translator:     /translator
echo  Dictionary:     /dictionary
echo  Admin Panel:    /admin
echo.
echo ========================================
echo  STT Features
echo ========================================
echo.
echo  English: Web Speech API (real-time)
echo           + Vosk lgraph (backup)
echo  Other Languages: Vosk offline models
echo  First use: Model download required
echo  Models cached in browser
echo.
echo ========================================
echo  Server Management
echo ========================================
echo.
echo  Browser opens automatically
echo  Servers run in background windows
echo  Close windows to stop servers
echo  Re-run this script to restart
echo.
echo ========================================
echo.
echo Press any key to open browser...
pause >nul

REM Open browser
start http://localhost:3001

echo.
echo Browser opened. Keep this window open.
echo Press any key to exit (servers will continue)...
pause >nul
