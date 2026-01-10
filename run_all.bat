@echo off
REM ========================================
REM UniLingo - Run Frontend and Backend
REM ========================================
REM Each server runs in a separate window
REM Browser opens automatically via Vite

echo.
echo ========================================
echo        UniLingo Server Startup
echo ========================================
echo.

REM Get current directory
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed. Please install Python first.
    echo Download: https://www.python.org/
    pause
    exit /b 1
)

REM Kill existing processes on port 3000 (Frontend) - IPv4 and IPv6
echo [0/2] Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo      Killing process on port 3000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

REM Kill existing processes on port 8000 (Backend) - IPv4 and IPv6
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo      Killing process on port 8000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

REM Wait a moment for ports to be released
timeout /t 2 /nobreak >nul

REM Start Backend Flask server first (new window)
echo [1/2] Starting Backend Flask server on port 8000...
cd /d "%PROJECT_DIR%backend"
if not exist "..\venv" (
    echo      Creating virtual environment...
    python -m venv ..\venv
    call ..\venv\Scripts\activate.bat
    echo      Installing backend requirements...
    pip install -r requirements.txt
) else (
    call ..\venv\Scripts\activate.bat
)
start "UniLingo Backend (8000)" cmd /k "cd /d "%PROJECT_DIR%backend" && call ..\venv\Scripts\activate.bat && python app.py"

REM Wait for backend to start
echo      Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Start Frontend (new window) - Browser opens automatically via Vite
echo [2/2] Starting Frontend server on port 3000...
cd /d "%PROJECT_DIR%frontend"
if not exist "node_modules" (
    echo      Installing npm packages...
    call npm install
)
start "UniLingo Frontend (3000)" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo ========================================
echo        Servers Started Successfully
echo ========================================
echo.
echo  Frontend:   http://localhost:3000
echo  Backend:    http://localhost:8000
echo  STT Stream: http://localhost:3000/stt-stream
echo.
echo  Browser will open automatically.
echo  Close this window to keep servers running.
echo.
echo ========================================
pause
