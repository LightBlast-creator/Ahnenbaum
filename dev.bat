@echo off
setlocal

:: ── Navigate to script directory ────────────────────────────────────
cd /d "%~dp0"

:: ── Run migrations ──────────────────────────────────────────────────
echo [DB] Running database migrations...
call npm run db:migrate -w packages/server
if errorlevel 1 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)

:: ── Start server ────────────────────────────────────────────────────
echo [SERVER] Starting server (port 3000)...
start "Ahnenbaum Server" cmd /c "npm run dev -w packages/server"

:: ── Start client ────────────────────────────────────────────────────
echo [CLIENT] Starting client (port 5173)...
start "Ahnenbaum Client" cmd /c "npm run dev -w packages/client"

:: ── Open browser ────────────────────────────────────────────────────
timeout /t 4 /nobreak >nul
echo [BROWSER] Opening http://localhost:5173 ...
start http://localhost:5173

echo.
echo ================================================
echo   Ahnenbaum dev environment running
echo   Server: http://localhost:3000
echo   Client: http://localhost:5173
echo   Close the server/client windows to stop
echo ================================================
echo.
pause
