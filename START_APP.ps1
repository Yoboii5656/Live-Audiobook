# AI Audiobook Reader - PowerShell Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Audiobook Reader - Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend directory exists
if (-Not (Test-Path ".\backend")) {
    Write-Host "❌ Error: backend directory not found!" -ForegroundColor Red
    exit 1
}

# Check if frontend directory exists
if (-Not (Test-Path ".\frontend")) {
    Write-Host "❌ Error: frontend directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\backend'; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Frontend Development Server..." -ForegroundColor Yellow
Write-Host ""

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\frontend'; npm run dev"

Write-Host "⏳ Waiting for frontend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Servers Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  " -NoNewline
Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: " -NoNewline
Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening app in browser..." -ForegroundColor Yellow

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "✨ App is now running!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Features to try:" -ForegroundColor Magenta
Write-Host "  1. Upload a PDF" -ForegroundColor White
Write-Host "  2. Toggle to Text View (📖 button)" -ForegroundColor White
Write-Host "  3. Click any word to start reading from there" -ForegroundColor White
Write-Host "  4. Watch the yellow highlight follow along!" -ForegroundColor White
Write-Host ""
Write-Host "To stop servers, close the PowerShell windows." -ForegroundColor Gray
Write-Host ""
