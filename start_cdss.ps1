# AffiongAI CDSS Ultimate Launcher
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Starting AffiongAI Full-Stack System   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Note: Ensure 'ollama run llama3' is already running in the background." -ForegroundColor Yellow

# Function to start the FastAPI Python Backend
$backendJob = Start-Job -ScriptBlock {
    Set-Location -Path $using:PWD
    .\.venv\Scripts\Activate.ps1
    python main.py
}
Write-Host "[+] Python FastAPI Backend starting on port 8686..." -ForegroundColor Green

# Function to start the React Frontend
$frontendJob = Start-Job -ScriptBlock {
    Set-Location -Path "$using:PWD\frontend"
    npm run dev
}
Write-Host "[+] React UI Server starting on port 5173..." -ForegroundColor Green

# Wait a few seconds for servers to boot, then open browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "System is online. Keep this window open." -ForegroundColor Cyan
Write-Host "Press [ENTER] to shut down all servers." -ForegroundColor Red
Read-Host

# Cleanup jobs when user presses ENTER
Write-Host "Shutting down servers..." -ForegroundColor Yellow
Stop-Job -Job $backendJob
Stop-Job -Job $frontendJob
Remove-Job -Job $backendJob
Remove-Job -Job $frontendJob
Write-Host "Shutdown complete." -ForegroundColor Green
