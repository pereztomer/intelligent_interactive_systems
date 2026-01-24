# Railway Deployment Guide

## Quick Setup

1. **Connect to Railway:**
   - Go to [railway.com](https://railway.com)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository and branch

2. **Deploy Backend Service:**
   - Railway will auto-detect Python
   - Set environment variables in Railway dashboard:
     - `GOOGLE_API_KEY` (required)
     - `GEMINI_MODEL=gemini-2.5-flash` (optional)
     - `FLASK_APP=backend/api_server.py`
     - `FLASK_ENV=production`
   - Railway will use the `Procfile` to start Flask

3. **Deploy Frontend Service:**
   - Create a new service in the same Railway project
   - Set root directory to project root
   - Railway will auto-detect Node.js
   - Set build command: `npm install && npm run build`
   - Set start command: `npm run start` (or use a static file server)
   - **Important:** Set environment variable:
     - `VITE_API_URL` = your backend service URL (Railway will provide this)

## Environment Variables

Set these in Railway dashboard for **backend service**:
- `GOOGLE_API_KEY` (required)
- `GEMINI_MODEL=gemini-2.5-flash`
- `FLASK_APP=backend/api_server.py`
- `FLASK_ENV=production`
- `PORT` (Railway sets this automatically)

Set these in Railway dashboard for **frontend service**:
- `VITE_API_URL` = Backend service URL (e.g., `https://your-backend.railway.app`)

## Notes

- Railway will automatically detect Python for backend and Node.js for frontend
- The `Procfile` tells Railway how to start the Flask server
- Frontend needs to know the backend URL - set `VITE_API_URL` during build
- Both services will get their own URLs from Railway
