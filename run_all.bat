@echo off
REM Batch file to run Frontend and Backend servers
REM Each server runs in a separate window

echo ========================================
echo Starting Frontend and Backend Server
echo ========================================
echo.

REM Get current directory
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

REM Start Frontend (new window)
echo Starting Frontend server in a new window...
cd /d "%PROJECT_DIR%frontend"
if not exist "node_modules" (
    echo node_modules not found. Installing packages...
    call npm install
)
start "Frontend Server" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start Backend Flask server (new window)
echo Starting Backend Flask server in a new window...
cd /d "%PROJECT_DIR%backend"
if not exist "..\venv" (
    echo Virtual environment not found. Creating one...
    python -m venv ..\venv
    call ..\venv\Scripts\activate.bat
    echo Installing backend requirements...
    pip install -r requirements.txt
) else (
    call ..\venv\Scripts\activate.bat
)
start "Backend Server" cmd /k "cd /d "%PROJECT_DIR%backend" && call ..\venv\Scripts\activate.bat && python app.py"

echo.
echo Both servers are running in separate windows.
echo.
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000
echo.
echo Press any key to exit...
pause

