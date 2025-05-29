#!/bin/bash

echo "🚀 Deploying fixes to Heroku..."

# Add all changes
git add .

# Commit the changes
git commit -m "🔧 Fix: Route priority for React app serving in production

- Moved health check from root (/) to /api/health only
- Fixed route order: API routes first, then static files, then catch-all
- Added production environment config for client
- Now root route serves React app instead of JSON response

Fixes: Heroku showing JSON instead of React app"

# Push to Heroku
echo "📤 Pushing to Heroku..."
git push heroku main

echo "✅ Deployment complete!"
echo "🌐 Your app should now show the React app at:"
echo "   https://dry-cliffs-57282-2269f6e54282.herokuapp.com/"
echo ""
echo "🔍 Health check is now available at:"
echo "   https://dry-cliffs-57282-2269f6e54282.herokuapp.com/api/health"
