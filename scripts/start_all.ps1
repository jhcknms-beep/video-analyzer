# ── Start all services ──────────────────────────
# Run from project root: powershell -File scripts/start_all.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  短视频批量分析工具 — 启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
$ErrorActionPreference = "Stop"

# 1. Check Ollama
Write-Host "[1/3] 检查 Ollama 服务..." -ForegroundColor Yellow
$ollamaStatus = ollama list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ollama 未运行，正在启动..." -ForegroundColor Red
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}
Write-Host "  ✓ Ollama 就绪" -ForegroundColor Green

# Check if qwen3-vl:8b is installed
$models = ollama list 2>&1
if ($models -notmatch "qwen3-vl:8b") {
    Write-Host "  ! qwen3-vl:8b 未安装，正在拉取..." -ForegroundColor Yellow
    ollama pull qwen3-vl:8b
}
Write-Host "  ✓ 模型已就绪" -ForegroundColor Green

# 2. Start Backend
Write-Host "[2/3] 启动后端服务 (FastAPI :8001)..." -ForegroundColor Yellow
$backendDir = "$PSScriptRoot\..\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "  ✓ 后端运行中: http://localhost:8001" -ForegroundColor Green
Write-Host "  ✓ API 文档: http://localhost:8001/docs" -ForegroundColor Green

# 3. Start Frontend
Write-Host "[3/3] 启动前端 (Next.js :3000)..." -ForegroundColor Yellow
$frontendDir = "$PSScriptRoot\..\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "  ✓ 前端运行中: http://localhost:3000" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  所有服务已启动!" -ForegroundColor Cyan
Write-Host "  前端: http://localhost:3000" -ForegroundColor White
Write-Host "  后端: http://localhost:8001" -ForegroundColor White
Write-Host "  API 文档: http://localhost:8001/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键退出此窗口（服务会继续运行）" -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
