@echo off
echo.
echo =============================================
echo  🩺 DrawDx - Draw Your Pain, Discover the Cause
echo =============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python detected
echo.

REM Install dependencies if requirements.txt exists
if exist requirements.txt (
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment configuration...
    copy .env.example .env >nul 2>&1
    echo ✅ Created .env file (you can add your OpenAI API key later)
    echo.
)

echo 🚀 Starting DrawDx server...
echo.
echo Open your browser to: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

REM Start the Flask application
python app.py
