@echo off
echo Starting MemoxBasel servers...

REM Get the directory where the script is located
set SCRIPT_DIR=%~dp0

REM Start backend server in new window
echo Starting backend server...
start "MemoxBasel Backend" cmd /k "cd /d %SCRIPT_DIR%backend && uvicorn server:app --reload"

REM Start frontend server in new window
echo Installing frontend dependencies...
cd /d %SCRIPT_DIR%frontend
call npm i

echo Starting frontend server...
start "MemoxBasel Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && npm run start"

REM Wait 1 second then open browser
timeout /t 1 /nobreak >nul
echo Opening browser...
start http://localhost:3000

echo.
echo Servers are running!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000
echo.
echo Close the terminal windows to stop the servers
