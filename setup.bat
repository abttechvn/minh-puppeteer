@echo off
echo 🎬 Douyin Automation Suite - Windows Setup
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🚀 Running setup script...
call node setup.js

echo.
echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Add your Douyin cookies to cookies.json
echo 2. Run: npm run extract "YOUR_CHANNEL_URL"
echo.
pause
