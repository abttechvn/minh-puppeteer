#!/bin/bash

echo "🎬 Douyin Automation Suite - Mac/Linux Setup"
echo "============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js from:"
    echo "https://nodejs.org/"
    echo ""
    echo "Or use a package manager:"
    echo "  macOS: brew install node"
    echo "  Ubuntu: sudo apt install nodejs npm"
    echo ""
    exit 1
fi

echo "✅ Node.js is installed"
node --version

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🚀 Running setup script..."
node setup.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your Douyin cookies to cookies.json"
echo "2. Run: npm run extract 'YOUR_CHANNEL_URL'"
echo ""
