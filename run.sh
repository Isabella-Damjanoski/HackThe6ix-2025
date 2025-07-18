#!/bin/bash

echo ""
echo "============================================="
echo " 🩺 DrawDx - Draw Your Pain, Discover the Cause"
echo "============================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

echo "✅ Python detected"
echo ""

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment configuration..."
    cp .env.example .env 2>/dev/null || true
    echo "✅ Created .env file (you can add your OpenAI API key later)"
    echo ""
fi

echo "🚀 Starting DrawDx server..."
echo ""
echo "Open your browser to: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Flask application
python3 app.py
