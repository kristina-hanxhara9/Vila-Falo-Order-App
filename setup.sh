#!/bin/bash

# Restaurant Order System - Easy Development Startup Script

echo "🚀 Starting Vila Falo Restaurant Order System..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js installation
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check npm installation
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

echo "📁 Project directory: $SCRIPT_DIR"
echo "📁 Server directory: $SERVER_DIR"
echo "📁 Client directory: $CLIENT_DIR"
echo ""

# Check if directories exist
if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ Server directory not found: $SERVER_DIR"
    exit 1
fi

if [ ! -d "$CLIENT_DIR" ]; then
    echo "❌ Client directory not found: $CLIENT_DIR"
    exit 1
fi

# Function to install dependencies
install_dependencies() {
    local dir=$1
    local name=$2
    
    echo "📦 Installing $name dependencies..."
    cd "$dir"
    
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found in $dir"
        return 1
    fi
    
    # Install dependencies
    npm install
    
    if [ $? -eq 0 ]; then
        echo "✅ $name dependencies installed successfully"
    else
        echo "❌ Failed to install $name dependencies"
        return 1
    fi
    
    echo ""
}

# Install server dependencies
install_dependencies "$SERVER_DIR" "Server"

# Install client dependencies  
install_dependencies "$CLIENT_DIR" "Client"

echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start the server (in one terminal):"
echo "   cd server"
echo "   npm run dev"
echo ""
echo "2. Start the client (in another terminal):"
echo "   cd client" 
echo "   npm start"
echo ""
echo "3. Open your browser to: http://localhost:3000"
echo ""
echo "🔧 If you get connection errors:"
echo "   - Make sure the server is running on port 5000"
echo "   - Check that .env.local file exists in client folder"
echo "   - Verify MongoDB connection string"
echo ""
echo "💡 Troubleshooting tips:"
echo "   - Server logs will show in the server terminal"
echo "   - Client logs will show in browser console (F12)"
echo "   - API calls should go to http://localhost:5000/api"
echo ""
echo "🎨 Your dashboard should now have colorful styling!"
echo "Happy coding! 🚀"
