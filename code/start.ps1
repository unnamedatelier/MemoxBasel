# PowerShell script to start MemoxBasel servers

Write-Host "Starting MemoxBasel servers..." -ForegroundColor Blue

# Get the directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Setup backend virtual environment and start server
Write-Host "Setting up backend environment..." -ForegroundColor Green
$backendPath = Join-Path $ScriptDir "backend"
$venvPath = Join-Path $backendPath "venv"

Set-Location $backendPath

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
& "$venvPath\Scripts\Activate.ps1"
pip install -r requirements.txt

Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '.\venv\Scripts\Activate.ps1'; uvicorn server:app --reload"

# Start frontend server
Write-Host "Installing frontend dependencies..." -ForegroundColor Green
$frontendPath = Join-Path $ScriptDir "frontend"
Set-Location $frontendPath
npm i

Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run start"

# Wait 1 second then open browser
Start-Sleep -Seconds 1
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Servers are running!" -ForegroundColor Blue
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend: http://localhost:8000"
Write-Host ""
Write-Host "Close the PowerShell windows to stop the servers"
