@echo off
REM FS Advisory - Accounting Dashboard launcher
REM Starts both the API server (port 3001) and the web app (port 5173)

setlocal
set "NODE_HOME=C:\Users\ADMIN\AppData\Local\Temp\opencode\node\node-v24.19.0-win-x64"
set "PATH=%NODE_HOME%;%PATH%"

echo Starting FS Advisory Application...
echo   API: http://localhost:3001
echo   App: http://localhost:5173
echo.

start "FS Advisory API" cmd /k "set PATH=%NODE_HOME%;%PATH% && node server\index.js"
start "FS Advisory App" cmd /k "set PATH=%NODE_HOME%;%PATH% && cd client && npm run dev"

echo Both processes started. Press any key to close this window...
pause >nul
