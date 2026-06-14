@echo off
set ROOT=C:\Users\admin\video-analyzer
set PYTHON=C:\Users\admin\AppData\Local\Programs\Python\Python312\pythonw.exe

taskkill /f /im python.exe >nul 2>&1
taskkill /f /im pythonw.exe >nul 2>&1

cd /d %ROOT%\backend
start "VideoAnalyzer-Backend" "%PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port 8001

timeout /t 4 /nobreak >nul

cd /d %ROOT%\frontend
start "VideoAnalyzer-Frontend" cmd /c npm run dev

timeout /t 6 /nobreak >nul

start http://localhost:3000
