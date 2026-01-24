# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend
COPY public ./public

# Copy .env file for environment variables
COPY .env ./.env

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Run Flask server
CMD ["python", "backend/api_server.py"]
