@echo off
REM ==============================================================================
REM RoutY: Real-Time Public Transport Tracking System
REM Windows Startup Script
REM ==============================================================================

echo =================================================================
echo   Starting RoutY Civic Transit Platform
echo =================================================================

start "RoutY Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul

start "RoutY Simulator" cmd /k "cd simulator && python main.py"
timeout /t 2 /nobreak >nul

start "RoutY Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =================================================================
echo   RoutY Services Launched!
echo   Commuter Interface: http://localhost:5173
echo   Admin Portal:       http://localhost:5173/admin/login
echo      Default Admin:   admin / RoutYAdmin2026!
echo   Backend API:        http://localhost:5000
echo =================================================================
pause
