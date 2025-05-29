#!/bin/bash

echo "🔧 FIXING CSS BUILD ERROR + Deploying to Heroku..."

# Add all changes
git add .

# Commit the CSS fix
git commit -m "🔧 FIX: CSS syntax error causing build failure

- Fixed malformed CSS escape characters in index.css
- Cleaned up professional-theme.css file
- Removed invalid CSS syntax that was breaking React build
- Maintained professional styling with proper CSS syntax

This should fix the Heroku build error and deploy successfully"

# Push to Heroku
echo "📤 Pushing fixed version to Heroku..."
git push heroku main

echo ""
echo "✅ CSS SYNTAX FIXED - Build should succeed now!"
echo "🌐 Your app will be available at:"
echo "   https://dry-cliffs-57282-2269f6e54282.herokuapp.com/"
