# TraceChat startup script
# Usage: .\start.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- 前置检查 ---
if (-not (Get-Command "uv" -ErrorAction SilentlyContinue)) {
    Write-Host "未找到 uv，请先运行 .\setup.ps1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$PSScriptRoot\backend\.env")) {
    Write-Host "未找到 backend\.env，请先运行 .\setup.ps1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$PSScriptRoot\backend\.venv")) {
    Write-Host "未找到虚拟环境，请先运行 .\setup.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "Starting TraceChat..." -ForegroundColor Cyan

# --- 启动后端 ---
Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Green
$backend = Start-Process -PassThru -FilePath "uv" `
    -ArgumentList "run uvicorn main:app --reload --port 8000" `
    -WorkingDirectory "$PSScriptRoot\backend"

Start-Sleep -Seconds 2

# --- 启动前端 ---
Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontend = Start-Process -PassThru -FilePath "npm.cmd" `
    -ArgumentList "run dev" `
    -WorkingDirectory "$PSScriptRoot\frontend"

Write-Host ""
Write-Host "TraceChat is running!" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

Wait-Process -Id $backend.Id, $frontend.Id
