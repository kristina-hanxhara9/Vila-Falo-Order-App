#!/bin/bash

# Vila Falo Restaurant System Setup Script
echo "🍽️  Starting Vila Falo Restaurant System..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the restaurant-order-system root directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."

# Server dependencies
if [ ! -d "server/node_modules" ]; then
    echo "📥 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Client dependencies  
if [ ! -d "client/node_modules" ]; then
    echo "📥 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Create .env files if they don't exist
if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating server .env file..."
    cat > server/.env << EOL
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://kristinazhidro97:vilafalo@cluster0.7kzfmxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
EOL
fi

if [ ! -f "client/.env" ]; then
    echo "⚙️  Creating client .env file..."
    cat > client/.env << EOL
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
EOL
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the system:"
echo "   1. Start the server: cd server && npm run dev"
echo "   2. Start the client: cd client && npm start"
echo ""
echo "🌐 The application will be available at:"
echo "   • Client: http://localhost:3000"
echo "   • Server: http://localhost:5000"
echo ""
echo "👥 Default login credentials:"
echo "   • Manager: admin@example.com / password123"
echo "   • Waiter: waiter@example.com / password123"
echo "   • Kitchen: kitchen@example.com / password123"
