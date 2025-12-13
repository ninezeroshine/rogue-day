@echo off
REM Rogue-Day Local Development Launcher
REM Starts both backend and frontend servers

echo.
echo ========================================
echo   Rogue-Day Local Development Launcher
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.11+ and add it to PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ and add it to PATH
    pause
    exit /b 1
)

REM Check if backend .env exists
if not exist "backend\.env" (
    echo [WARNING] backend\.env file not found
    echo Please create backend\.env with:
    echo   ALLOW_DEV_MODE=true
    echo   DATABASE_URL=postgresql://user:password@localhost:5432/rogue_day
    echo.
    echo Continuing anyway...
    echo.
)

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo [INFO] Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
    echo [INFO] Virtual environment created
    echo.
)

REM Activate virtual environment and install dependencies if needed
echo [INFO] Activating Python virtual environment...
call backend\venv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing backend dependencies...
    cd backend
    pip install -e ".[dev]" >nul 2>&1
    cd ..
    echo [INFO] Backend dependencies installed
    echo.
)

REM Check if frontend node_modules exists
if not exist "app\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd app
    call npm install
    cd ..
    echo [INFO] Frontend dependencies installed
    echo.
)

echo [INFO] Starting backend server on http://localhost:8000
echo [INFO] Starting frontend server on http://localhost:5173
echo.
echo ========================================
echo   Press Ctrl+C in any window to stop
echo ========================================
echo.

REM Start backend in new window
start "Rogue-Day Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && echo [BACKEND] Starting server... && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

REM Wait a bit for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend in new window
start "Rogue-Day Frontend" cmd /k "cd app && echo [FRONTEND] Starting server... && npm run dev"

echo.
echo [SUCCESS] Both servers are starting...
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Both windows should open automatically.
echo Close the windows or press Ctrl+C to stop the servers.
echo.
pause


