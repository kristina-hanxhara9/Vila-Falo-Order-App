# Vila Falo Order App

Restaurant order management system for Vila Falo. Supports three roles: **Waiter** (create/manage orders), **Kitchen** (real-time order display), and **Manager** (dashboard, menu, users, reports).

## Features

- Real-time order updates via Socket.io
- Role-based access (waiter, kitchen, manager)
- PIN-based authentication (4-digit PIN)
- Table management with status tracking
- Menu management with categories (food, drink, dessert)
- Sales reports with date filtering
- Receipt printing
- Mobile-responsive PWA
- Albanian language UI

## Tech Stack

- **Frontend**: React, Tailwind CSS, Socket.io client
- **Backend**: Express.js, Socket.io, JWT authentication
- **Database**: MongoDB (via Mongoose)
- **Security**: Helmet, express-rate-limit, bcrypt PIN hashing

## Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account (or local MongoDB)
- npm >= 8.0.0

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/kristina-hanxhara9/Vila-Falo-Order-App.git
   cd Vila-Falo-Order-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp server/.env.example server/.env
   ```
   Fill in your MongoDB URI and a strong JWT secret (32+ chars).

4. Set up initial users (run after configuring .env):
   ```bash
   node server/scripts/addDefaultPins.js
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```
   This starts both the API server (port 5000) and React dev server (port 3000).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing (32+ chars in production) | Yes |
| `CLIENT_URL` | Frontend URL for CORS | No (default: `http://localhost:3000`) |
| `NODE_ENV` | Environment (`development` or `production`) | No |
| `PORT` | Server port | No (default: `5000`) |

## Deployment

### Recommended: Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables in the Railway dashboard:
   - `MONGO_URI` - your MongoDB Atlas connection string
   - `JWT_SECRET` - generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `NODE_ENV` = `production`
   - `CLIENT_URL` - your Railway app URL
4. Railway auto-detects the build and start commands from `package.json`

### Alternative: Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Build command: `npm run build`
4. Start command: `npm start`
5. Set environment variables in the Render dashboard

## Default Users

After running `addDefaultPins.js`, default users have PIN `0000`. Change PINs via the Manager dashboard under User Management.

| Username | Role | Default PIN |
|----------|------|-------------|
| admin | Manager | 0000 |
| waiter | Waiter | 0000 |
| kitchen | Kitchen | 0000 |

## Project Structure

```
Vila-Falo-Order-App/
  client/           # React frontend
    src/
      components/   # Reusable components (ErrorBoundary, KitchenDisplay)
      contexts/     # Auth and Socket contexts
      pages/        # Route pages (Login, Manager/*, Waiter/*, Kitchen/*)
      styles/       # CSS design system
  server/           # Express backend
    config/         # Database and app configuration
    middleware/     # Auth middleware
    models/         # Mongoose schemas (User, Order, MenuItem, Table)
    routes/api/    # API route handlers
    scripts/       # Migration and seed scripts
    sockets/       # Socket.io event handlers
```
