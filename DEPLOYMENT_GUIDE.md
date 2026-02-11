# Timesheet Management System - Deployment Guide

## Overview
This is a full-stack Node.js/React application with PostgreSQL database. Follow this guide to deploy to production on your domain.

---

## PHASE 1: Local Setup & Testing

### Prerequisites
- Node.js 16+ (https://nodejs.org/)
- PostgreSQL 12+ (https://www.postgresql.org/download/)
- npm or yarn

### Step 1: Clone/Setup Project
```bash
cd timesheet-app/backend
npm install

cd ../frontend
npm install
cd ..
```

### Step 2: Setup PostgreSQL Database
```bash
# Create database user and database
createuser timesheet_user
createdb -O timesheet_user timesheet_db

# Or use psql shell:
psql -U postgres
> CREATE ROLE timesheet_user WITH LOGIN PASSWORD 'your_secure_password';
> CREATE DATABASE timesheet_db OWNER timesheet_user;
> \q
```

### Step 3: Configure Environment Variables

**Backend** - Create `.env` file in `backend/` folder:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=timesheet_user
DB_PASSWORD=your_secure_password
DB_NAME=timesheet_db

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=24h

MAX_HOURS_PER_DAY=12
MIN_DESCRIPTION_LENGTH=10
SESSION_TIMEOUT=1800000
```

**Frontend** - Create `.env` file in `frontend/` folder:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 4: Initialize Database
```bash
cd backend
npm run migrate
# This will create all tables and indexes
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# App opens on http://localhost:3000
```

### Step 6: Create Admin User (For Initial Setup)
Insert manually into database:
```sql
INSERT INTO users (name, email, password, role, status)
VALUES ('Admin', 'admin@company.com', '$2a$10$...hashed_password...', 'admin', 'active');
```

Or use a script in the future.

---

## PHASE 2: Production Deployment (Heroku/AWS/DigitalOcean)

### Option A: Deploy to Heroku (Easiest)

#### Backend on Heroku:
```bash
cd backend

# Create Heroku app
heroku create your-timesheet-api

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your_secret_key
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-timesheet-frontend.com

# Deploy
git push heroku main
```

#### Frontend on Vercel/Netlify:

**Vercel (Recommended):**
```bash
cd frontend
npm install -g vercel

vercel env add REACT_APP_API_URL=https://your-timesheet-api.herokuapp.com/api
vercel --prod
```

**Netlify:**
```bash
cd frontend
npm run build

# Drag & drop 'build' folder to Netlify
# Set environment variable: REACT_APP_API_URL
```

### Option B: Deploy to DigitalOcean

#### 1. Create Droplet
- Choose Ubuntu 22.04
- Size: 1GB RAM minimum (Basic $4/month works)
- Add your SSH key

#### 2. Setup Server
```bash
# SSH into server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

#### 3. Setup PostgreSQL
```bash
sudo -u postgres psql

CREATE ROLE timesheet_user WITH LOGIN PASSWORD 'your_password';
CREATE DATABASE timesheet_db OWNER timesheet_user;
\q
```

#### 4. Deploy Backend
```bash
cd /var/www
git clone your-repo-url timesheet-app
cd timesheet-app/backend

npm install
# Create .env file with production values

# Start with PM2
pm2 start server.js --name "timesheet-api"
pm2 startup
pm2 save
```

#### 5. Setup Nginx Proxy
```bash
sudo nano /etc/nginx/sites-available/timesheet-api

# Add this config:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/timesheet-api /etc/nginx/sites-enabled/

# Test & restart
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Setup SSL with Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com
```

#### 7. Deploy Frontend
```bash
cd /var/www/timesheet-app/frontend

npm install
REACT_APP_API_URL=https://api.yourdomain.com/api npm run build

# Serve with Nginx
sudo nano /etc/nginx/sites-available/timesheet-web

# Add config for frontend on port 443/80
# Enable SSL certificate

sudo systemctl restart nginx
```

### Option C: Deploy to AWS

#### Using Elastic Beanstalk:
```bash
# Install EB CLI
pip install awsebcli

# Initialize
cd backend
eb init -p "Node.js 18 running on 64bit Amazon Linux 2" --region us-east-1

# Create environment with RDS PostgreSQL
eb create timesheet-prod --instance-type t3.micro --database --database.engine postgres

# Set environment variables
eb setenv JWT_SECRET=your_secret NODE_ENV=production

# Deploy
eb deploy
```

#### RDS Database:
- Create PostgreSQL instance
- Set security group to allow EB instances
- Update DB_HOST in .env to RDS endpoint

#### Frontend:
- Build: `npm run build`
- Upload to S3
- Use CloudFront CDN
- Set CNAME to your domain

---

## PHASE 3: Connect Your Domain

### Subdomain Configuration (Recommended):

1. **API Subdomain** - api.yourdomain.com
   - Point to your backend server (Heroku URL or DigitalOcean IP)

2. **Web Subdomain** - app.yourdomain.com or www.yourdomain.com
   - Point to your frontend (Vercel, Netlify, or DigitalOcean)

3. **DNS Settings** (Update at your domain registrar):
   ```
   A record: yourdomain.com → DigitalOcean IP (or CNAME to Vercel)
   CNAME record: api.yourdomain.com → your-api.herokuapp.com
   CNAME record: app.yourdomain.com → your-frontend.vercel.app
   ```

### SSL/TLS Certificate:
- Use Let's Encrypt (FREE) - Automatic with Certbot
- Or use CloudFlare (FREE) - Add domain and set nameservers
- AWS Certificate Manager (FREE) for AWS deployments

---

## PHASE 4: Initial Data Setup

### Add Test Data:
```bash
# Login to your API and create:
1. Admin user (via API or database)
2. Manager user
3. Employee users
4. Projects
5. Assign employees to projects
```

### Environment Variables Checklist:

**Backend Production:**
- [ ] DB_HOST (RDS endpoint or server IP)
- [ ] DB_USER & DB_PASSWORD (strong password)
- [ ] JWT_SECRET (random 32+ character string)
- [ ] FRONTEND_URL (your frontend domain)
- [ ] NODE_ENV=production

**Frontend Production:**
- [ ] REACT_APP_API_URL (your API domain)

---

## PHASE 5: Monitoring & Maintenance

### Logs:
```bash
# Heroku
heroku logs --tail

# DigitalOcean
pm2 logs timesheet-api
sudo tail -f /var/log/nginx/error.log
```

### Database Backups:
```bash
# Regular backups (Daily)
pg_dump -h localhost -U timesheet_user timesheet_db > backup.sql

# Or use cloud provider's backup (Heroku, AWS RDS, etc.)
```

### Performance Monitoring:
- Set up New Relic or DataDog (optional)
- Monitor database query times
- Check server resource usage

### Updates:
```bash
# Keep dependencies updated
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

---

## Common Issues & Solutions

### "Database connection refused"
- Check DB_HOST, user, password
- Verify firewall rules allow connection
- Test with: `psql -h host -U user -d dbname`

### "CORS errors"
- Update FRONTEND_URL in backend .env
- Check nginx proxy headers (if using Nginx)

### "Token expired on every request"
- Check JWT_SECRET is same on all instances
- Verify system time is synchronized (NTP)

### "Database migrations not running"
- SSH into server and run: `npm run migrate`
- Check database user permissions

---

## Final Checklist

- [ ] Database configured and accessible
- [ ] Backend API running and responding
- [ ] Frontend builds and loads
- [ ] Login works with test account
- [ ] Can create timesheet entries
- [ ] Can submit and approve entries
- [ ] Admin panel accessible
- [ ] SSL certificate installed
- [ ] Domain pointing to servers
- [ ] Backup plan in place
- [ ] Monitoring enabled
- [ ] Error alerts configured

---

## Support & Documentation

- Backend API docs: Run server and visit `/api` (add swagger if needed)
- Database schema: See `schema.js`
- Environment config: See `.env.example` files
- Deployment updates: Check provider documentation (Heroku, Vercel, etc.)

---

**Total Estimated Time:**
- Local setup: 30 minutes
- Deploy to Heroku: 15 minutes
- Custom domain setup: 10-15 minutes
- Production hardening: 1-2 hours

**Ready to go live! 🚀**
