# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; pip install -r requirements.txt -q; uvicorn main:app --reload --port 8080"
# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm install; npm run dev"
Write-Host "Starting... Backend: http://localhost:8080 | Frontend: http://localhost:3000"
