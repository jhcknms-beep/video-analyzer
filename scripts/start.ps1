# Video Analyzer - Start All Services (terminals hidden)
$root = Split-Path $PSScriptRoot -Parent

Write-Host "Starting services..." -ForegroundColor Cyan

# Backend - hidden
Start-Process pythonw -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8001" -WorkingDirectory "$root\backend" -WindowStyle Hidden
Start-Sleep 3

# Frontend - hidden
Start-Process cmd -ArgumentList "/c cd `"$root\frontend`" && npm run dev" -WindowStyle Hidden
Start-Sleep 5

# Browser
Start-Process "http://localhost:3000"

Write-Host "Done! http://localhost:3000" -ForegroundColor Green
