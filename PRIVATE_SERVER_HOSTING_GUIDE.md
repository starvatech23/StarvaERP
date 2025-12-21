# Private Server Hosting Guide for StarVacon Project Management System

This guide explains how to deploy and host your Project Management System on a private server (VPS, cloud instance, or on-premise server).

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Architecture Overview](#architecture-overview)
4. [Deployment Methods](#deployment-methods)
5. [Docker Compose Deployment (Recommended)](#docker-compose-deployment-recommended)
6. [Manual Deployment](#manual-deployment)
7. [Environment Configuration](#environment-configuration)
8. [SSL/HTTPS Setup](#sslhttps-setup)
9. [Domain Configuration](#domain-configuration)
10. [Backup Strategy](#backup-strategy)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Security Best Practices](#security-best-practices)

---

## Prerequisites

Before deploying, ensure you have:
- A server (VPS or dedicated) with root/sudo access
- A domain name (optional but recommended)
- Basic knowledge of Linux command line
- SSH access to your server

## Server Requirements

### Minimum Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 40 GB SSD | 100+ GB SSD |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Required Software
- Docker & Docker Compose (recommended)
- OR: Python 3.11+, Node.js 18+, MongoDB 6.0+
- Nginx (reverse proxy)
- Certbot (for SSL)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              NGINX (Reverse Proxy)                      │
│              Port 80/443 (HTTP/HTTPS)                   │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────────┐   ┌──────────────────────┐
│   Frontend (Expo)    │   │   Backend (FastAPI)   │
│   Port 3000          │   │   Port 8001           │
│   React Native Web   │   │   REST API            │
└──────────────────────┘   └───────────┬───────────┘
                                       │
                                       ▼
                           ┌──────────────────────┐
                           │   MongoDB            │
                           │   Port 27017         │
                           └──────────────────────┘
```

---

## Deployment Methods

### Option A: Docker Compose (Recommended)
- Easiest to set up and maintain
- Consistent across environments
- Easy scaling and updates

### Option B: Manual Deployment
- More control over configuration
- Better for specific requirements
- Requires more expertise

---

## Docker Compose Deployment (Recommended)

### Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Create Deployment Directory

```bash
mkdir -p /opt/starvacon
cd /opt/starvacon
```

### Step 3: Create Docker Compose File

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: starvacon-mongodb
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: starvacon_admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - starvacon-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: starvacon-backend
    restart: always
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://starvacon_admin:${MONGO_PASSWORD}@mongodb:27017/starvacon?authSource=admin
      - DB_NAME=starvacon
      - SECRET_KEY=${SECRET_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
      - WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN}
      - WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID}
    depends_on:
      - mongodb
    networks:
      - starvacon-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: starvacon-frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - EXPO_PUBLIC_BACKEND_URL=https://your-domain.com
    networks:
      - starvacon-network

volumes:
  mongodb_data:

networks:
  starvacon-network:
    driver: bridge
```

### Step 4: Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Step 5: Create Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Build for web
RUN npx expo export:web

# Install serve for static file hosting
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Serve the built files
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Step 6: Create Environment File

Create `.env`:

```bash
# MongoDB
MONGO_PASSWORD=your_secure_mongodb_password

# Backend
SECRET_KEY=your_very_long_random_secret_key_here

# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Step 7: Deploy

```bash
# Copy your application files to the server
# scp -r /app/* user@your-server:/opt/starvacon/

# Start the services
cd /opt/starvacon
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

---

## SSL/HTTPS Setup

### Using Certbot with Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/starvacon
```

Add this Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/starvacon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

## Domain Configuration

### DNS Settings

Point your domain to your server's IP address:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | your.server.ip | 300 |
| A | www | your.server.ip | 300 |
| A | api | your.server.ip | 300 |

---

## Backup Strategy

### Automated MongoDB Backups

Create `/opt/starvacon/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/starvacon/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec starvacon-mongodb mongodump \
    --username starvacon_admin \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --out /tmp/backup_$DATE

docker cp starvacon-mongodb:/tmp/backup_$DATE $BACKUP_DIR/

# Compress
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

Add to crontab:

```bash
chmod +x /opt/starvacon/backup.sh
crontab -e
# Add: 0 2 * * * /opt/starvacon/backup.sh >> /var/log/starvacon-backup.log 2>&1
```

---

## Monitoring & Maintenance

### Health Check Script

Create `/opt/starvacon/healthcheck.sh`:

```bash
#!/bin/bash

# Check if services are running
SERVICES=("starvacon-mongodb" "starvacon-backend" "starvacon-frontend")

for service in "${SERVICES[@]}"; do
    if ! docker ps | grep -q $service; then
        echo "$(date): $service is DOWN - restarting..."
        docker compose -f /opt/starvacon/docker-compose.yml restart $service
    fi
done

# Check API health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
if [ "$HTTP_CODE" != "200" ]; then
    echo "$(date): Backend health check failed (HTTP $HTTP_CODE)"
fi
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Update Application

```bash
cd /opt/starvacon

# Pull latest changes (if using git)
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Security Best Practices

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. Fail2Ban for SSH Protection

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Updates

```bash
# Create update script
sudo apt update && sudo apt upgrade -y
docker compose pull
docker compose up -d
```

### 4. Environment Security

- Never commit `.env` files to git
- Use strong, unique passwords
- Rotate API keys periodically
- Enable 2FA where possible

---

## Troubleshooting

### Common Issues

**1. Container won't start**
```bash
docker compose logs <service-name>
```

**2. MongoDB connection refused**
- Check if MongoDB container is running
- Verify connection string in environment

**3. Frontend can't reach API**
- Check CORS settings in backend
- Verify EXPO_PUBLIC_BACKEND_URL is correct

**4. SSL certificate issues**
```bash
sudo certbot renew --dry-run
```

---

## Support

For additional help:
- Check application logs: `docker compose logs -f`
- MongoDB logs: `docker exec starvacon-mongodb mongosh`
- Nginx logs: `/var/log/nginx/error.log`

---

*Last Updated: December 2025*
