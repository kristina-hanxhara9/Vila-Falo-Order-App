#!/bin/bash

echo "🍽️ Vila Falo - Deploying with Option 2 (Modern Premium Design) to Heroku"
echo "=================================================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged in to Heroku. Please login first:"
    echo "   heroku login"
    exit 1
fi

echo "✅ Heroku CLI detected and authenticated"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Initializing..."
    git init
    git add .
    git commit -m "Initial commit with Option 2 premium design"
fi

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building client application..."
cd client
npm install
npm run build
cd ..

echo "🎨 Option 2 (Modern Premium Design) has been applied!"
echo "   - Light gray background (#f8fafc)"
echo "   - Premium cards with enhanced shadows"
echo "   - Gradient backgrounds for status indicators"
echo "   - Colored top borders on cards"
echo "   - Sophisticated hover effects"

# Check if Heroku app exists
read -p "Enter your Heroku app name (or press Enter to create a new one): " app_name

if [ -z "$app_name" ]; then
    echo "🆕 Creating new Heroku app..."
    heroku create
    app_name=$(heroku apps:info --json | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    echo "✅ Created app: $app_name"
else
    # Check if app exists
    if heroku apps:info $app_name &> /dev/null; then
        echo "✅ Using existing app: $app_name"
        heroku git:remote -a $app_name
    else
        echo "🆕 Creating app: $app_name"
        heroku create $app_name
    fi
fi

echo "🔧 Setting up environment variables..."

# Set Node.js version
heroku config:set NODE_VERSION=22.15.1 -a $app_name

# Set NPM version  
heroku config:set NPM_VERSION=11.4.0 -a $app_name

# Prompt for MongoDB connection string if not set
if [ -z "$(heroku config:get MONGODB_URI -a $app_name)" ]; then
    read -p "Enter your MongoDB connection string: " mongodb_uri
    heroku config:set MONGODB_URI="$mongodb_uri" -a $app_name
fi

# Prompt for JWT secret if not set
if [ -z "$(heroku config:get JWT_SECRET -a $app_name)" ]; then
    jwt_secret=$(openssl rand -base64 32)
    heroku config:set JWT_SECRET="$jwt_secret" -a $app_name
    echo "✅ Generated and set JWT_SECRET"
fi

# Set PORT (Heroku will provide this automatically, but good to be explicit)
heroku config:set PORT=5000 -a $app_name

# Set production environment
heroku config:set NODE_ENV=production -a $app_name

echo "📡 Environment variables configured:"
heroku config -a $app_name

echo "🚀 Deploying to Heroku..."

# Add and commit changes
git add .
git commit -m "Deploy Option 2 (Modern Premium Design) - $(date)"

# Deploy to Heroku
git push heroku main

echo "✅ Deployment complete!"
echo ""
echo "🌟 Your Vila Falo restaurant system with Option 2 design is now live at:"
echo "   https://$app_name.herokuapp.com"
echo ""
echo "🔗 Heroku Dashboard: https://dashboard.heroku.com/apps/$app_name"
echo ""
echo "📋 Next Steps:"
echo "   1. Test the application at the URL above"
echo "   2. Create your first manager account"
echo "   3. Set up your menu items"
echo "   4. Configure your tables"
echo ""
echo "🎨 Design Features Active:"
echo "   ✓ Modern Premium look and feel"
echo "   ✓ Light gray background for reduced eye strain"
echo "   ✓ Enhanced card shadows and hover effects"
echo "   ✓ Gradient status indicators"
echo "   ✓ Professional color scheme"
echo "   ✓ Responsive design for all devices"
echo ""
echo "🍽️ Enjoy your new restaurant management system!"
