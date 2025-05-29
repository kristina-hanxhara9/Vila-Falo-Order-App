# 🐛 TROUBLESHOOTING GUIDE - Vila Falo Restaurant System

## Common Issues and Solutions

### Issue 1: "Gabim! Gabim në server" when creating orders

**Symptoms:**
- Error message appears when waiters try to create new orders
- Albanian error message: "Gabim! Gabim në server. Ju lutem provoni përsëri."

**Possible Causes & Solutions:**

1. **Server Not Running**
   ```bash
   # Check if server is running
   curl http://localhost:5000
   
   # Start the server
   cd server
   npm run dev
   ```

2. **Database Connection Issues**
   - Check MongoDB connection string in `server/.env`
   - Ensure MongoDB cluster is accessible
   - Check network connectivity

3. **Authentication Issues**
   ```bash
   # Clear browser storage and login again
   # Or check if JWT token is valid
   ```

4. **Missing Dependencies**
   ```bash
   # Reinstall server dependencies
   cd server
   rm -rf node_modules
   npm install
   ```

### Issue 2: Dashboard appears in black and white

**Solution:**
- CSS files should now be properly imported with enhanced colors
- Clear browser cache (Cmd/Ctrl + Shift + R)
- Check that all CSS files are loading in browser dev tools

### Issue 3: Server connection timeouts

**Solution:**
```bash
# Increase timeout in client requests
# Check server logs for errors
cd server
npm run dev

# Check server health
curl http://localhost:5000/api/health
```

## Quick Fixes

### 1. Complete System Reset

```bash
# Stop all processes
pkill -f "node"

# Clear dependencies
rm -rf server/node_modules client/node_modules

# Reinstall everything
cd server && npm install && cd ../client && npm install && cd ..

# Start fresh
cd server && npm run dev &
cd client && npm start
```

### 2. Database Issues

```bash
# Check database connection
cd server
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://kristinazhidro97:vilafalo@cluster0.7kzfmxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"
```

### 3. Port Conflicts

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000  
lsof -ti:3000 | xargs kill -9
```

## Development Commands

```bash
# Server development
cd server
npm run dev

# Client development
cd client  
npm start

# Check logs
cd server
tail -f logs/server.log

# Test API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/tables
```

## Environment Variables

**Server (.env):**
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://kristinazhidro97:vilafalo@cluster0.7kzfmxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
```

**Client (.env):**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Browser Developer Tools

1. Open Chrome/Firefox Developer Tools (F12)
2. Check Console for JavaScript errors
3. Check Network tab for failed API requests
4. Check Application/Storage for authentication tokens

## Contact Information

If issues persist:
1. Check server console logs
2. Check browser console for errors
3. Ensure all dependencies are installed
4. Verify environment variables are set correctly

## Recent Fixes Applied

✅ Enhanced error handling in NewOrder.js
✅ Added server health check endpoints
✅ Improved CSS color scheme
✅ Added connection testing before API calls
✅ Better authentication token handling
✅ Comprehensive error messages with emojis
✅ Server startup verification
