@echo off
title Video Analyzer

cd /d "%~dp0.."

echo ============================================
echo   Video Analyzer - Starting services...
echo ============================================
echo.

echo [1/3] Starting backend (FastAPI :8001)...
start "VideoAnalyzer-Backend" cmd /c "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8001"
echo   OK - Backend starting...

timeout /t 3 /nobreak >nul

echo [2/3] Starting frontend (Next.js :3000)...
start "VideoAnalyzer-Frontend" cmd /c "cd frontend && npm run dev"
echo   OK - Frontend starting...

timeout /t 5 /nobreak >nul

echo [3/3] Opening browser...
start http://localhost:3000

echo.
echo ============================================
echo   All services started!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8001
echo   API Docs : http://localhost:8001/docs
echo ============================================
echo.
echo Close this window to stop all services.
echo To stop, close the Backend and Frontend windows.
echo.
pause
