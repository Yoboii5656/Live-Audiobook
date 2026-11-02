@echo off
echo ========================================
echo   AI Audiobook Reader - Startup Script
echo ========================================
echo.

echo [1/2] Starting Backend Server...
echo.
start "Backend Server" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Development Server...
echo.
start "Frontend Server" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to open the app in browser...
pause >nul

start http://localhost:5173

echo.
echo App opened in browser!
echo Close this window or press Ctrl+C to stop.
pause
