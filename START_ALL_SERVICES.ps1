# SentinelVault - Start All Services
# Executable from anywhere - accesses any device on your network

# Get local machine IP
$ipconfig = ipconfig | Select-String "IPv4 Address"
$machineIP = ($ipconfig -split ": ")[1] | ForEach-Object { $_.Trim() }
if (-not $machineIP) { $machineIP = "192.168.0.205" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 SENTINELVAULT SERVICES LAUNCHER" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Machine IP: $machineIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "📍 ACCESSIBLE URLS FROM ANY DEVICE:" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "Frontend:        http://$machineIP`:5173" -ForegroundColor Green
Write-Host "Backend API:     http://$machineIP`:5000/api" -ForegroundColor Green
Write-Host "Backend Health:  http://$machineIP`:5000/api/health" -ForegroundColor Green
Write-Host "AI Engine:       http://$machineIP`:8001" -ForegroundColor Green
Write-Host "AI Health:       http://$machineIP`:8001/health" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Starting services in separate terminals..." -ForegroundColor Yellow
Write-Host ""

$projectPath = "c:\Users\Lenovo\OneDrive\Desktop\internship project"

# Terminal 1: Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\backend'; npm run dev" -WindowStyle Normal

# Terminal 2: Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\frontend'; npm run dev" -WindowStyle Normal

# Terminal 3: AI Engine
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\ai-engine'; uvicorn app:app --reload --host 0.0.0.0 --port 8001" -WindowStyle Normal

Write-Host "✅ Services launched!" -ForegroundColor Green
Write-Host "✅ Open any of the URLs above from any device on your network" -ForegroundColor Green
Write-Host ""
Write-Host "Press CTRL+C here to close all services (optional)" -ForegroundColor Cyan
