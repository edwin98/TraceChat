# TraceChat startup script
# Usage: .\start.ps1

Write-Host "Starting TraceChat..." -ForegroundColor Cyan

# Check .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "ERROR: backend\.env not found. Copy backend\.env.example to backend\.env and fill in ANTHROPIC_API_KEY" -ForegroundColor Red
    exit 1
}

# Start backend
Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Green
$backend = Start-Process -PassThru -FilePath "python" -ArgumentList "-m uvicorn main:app --reload --port 8000" -WorkingDirectory "$PSScriptRoot\backend"

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontend = Start-Process -PassThru -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend"

Write-Host ""
Write-Host "TraceChat is running!" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

Wait-Process -Id $backend.Id, $frontend.Id
