# Video Analyzer - Silent Launcher (no terminal windows)
$root = Split-Path $PSScriptRoot -Parent

# Kill any old backend processes
Get-Process -Name "python","pythonw" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*main:app*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue

# Start backend
$backendDir = "$root\backend"
Start-Process -FilePath "pythonw" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8001" -WorkingDirectory $backendDir -WindowStyle Hidden
Start-Sleep 3

# Verify backend started
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 5
} catch {
    # Try with regular python if pythonw failed
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8001" -WorkingDirectory $backendDir -WindowStyle Hidden
    Start-Sleep 3
}

# Start frontend
Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$root\frontend`" && npm run dev" -WindowStyle Hidden
Start-Sleep 5

# Open browser
Start-Process "http://localhost:3000"
