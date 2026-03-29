@echo off
rem Change directory to the folder where the script is located
cd /d "%~dp0"
echo Starting Voyageur Pro...
echo Accessing the app at http://localhost:3001
start http://localhost:3001
npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error starting the development server. Please check your Node.js installation.
    pause
)
