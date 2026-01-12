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

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Docker is not installed. Database may not work.
    echo Download: https://www.docker.com/
) else (
    echo [0/3] Checking PostgreSQL database...
    
    REM Check if Docker is running
    docker info >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo      [WARNING] Docker is not running. Please start Docker Desktop.
    ) else (
        REM Check if container exists
        docker ps -a --filter "name=unilingo-postgres" --format "{{.Names}}" | findstr "unilingo-postgres" >nul 2>nul
        if %ERRORLEVEL% neq 0 (
            echo      Creating PostgreSQL container...
            docker run -d --name unilingo-postgres -e POSTGRES_USER=starsite -e POSTGRES_PASSWORD=Rmrehd106!! -e POSTGRES_DB=unilingo -p 5444:5432 postgres:16-alpine
        ) else (
            REM Check if container is running
            docker ps --filter "name=unilingo-postgres" --format "{{.Names}}" | findstr "unilingo-postgres" >nul 2>nul
            if %ERRORLEVEL% neq 0 (
                echo      Starting PostgreSQL container...
                docker start unilingo-postgres
            ) else (
                echo      PostgreSQL is already running.
            )
        )
        
        REM Wait for database to be ready
        echo      Waiting for database to be ready...
        timeout /t 3 /nobreak >nul
    )
)

REM Kill existing processes on port 3001 (Frontend) - IPv4 and IPv6
echo [1/3] Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo      Killing process on port 3001 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

REM Kill existing processes on port 8001 (Backend) - IPv4 and IPv6
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo      Killing process on port 8001 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

REM Wait a moment for ports to be released
timeout /t 2 /nobreak >nul

REM Start Backend Flask server first (new window)
echo [2/3] Starting Backend Flask server on port 8001...
cd /d "%PROJECT_DIR%"
if not exist "venv" (
    echo      Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo      Installing backend requirements...
    pip install -r backend\requirements.txt
) else (
    call venv\Scripts\activate.bat
)
start "UniLingo Backend (8001)" cmd /k "cd /d "%PROJECT_DIR%" && call venv\Scripts\activate.bat && cd backend && python app.py"

REM Wait for backend to start
echo      Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Start Frontend (new window) - Browser opens automatically via Vite
echo [3/3] Starting Frontend server on port 3001...
cd /d "%PROJECT_DIR%frontend"
if not exist "node_modules" (
    echo      Installing npm packages...
    call npm install
)
start "UniLingo Frontend (3001)" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo ========================================
echo        Servers Started Successfully
echo ========================================
echo.
echo  Database:   PostgreSQL on port 5444
echo  Frontend:   http://localhost:3001
echo  Backend:    http://localhost:8001
echo  STT Stream: http://localhost:3001/stt-stream
echo.
echo  Browser will open automatically.
echo  Close this window to keep servers running.
echo.
echo ========================================
pause
