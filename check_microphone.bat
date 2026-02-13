@echo off
echo ========================================
echo Checking Microphone Usage
echo ========================================
echo.

echo [1] Processes that might be using microphone:
echo.
tasklist | findstr /i "zoom teams discord skype chrome msedge firefox obs"
echo.

echo [2] All Chrome processes:
echo.
tasklist | findstr /i "chrome"
echo.

echo [3] Audio devices status:
echo.
powershell -Command "Get-PnpDevice -Class 'AudioEndpoint' | Where-Object {$_.FriendlyName -like '*Microphone*' -or $_.FriendlyName -like '*Mic*'} | Format-Table -AutoSize"
echo.

echo ========================================
echo Quick Fixes:
echo 1. Close other apps using microphone (Zoom, Teams, etc.)
echo 2. Restart Chrome completely (close all windows)
echo 3. Check Windows Sound Settings - Recording tab
echo ========================================
pause
