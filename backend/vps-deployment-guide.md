# 🚀 FaceBlog VPS Deployment Guide

## 📋 Prerequisites

### 1. VPS Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB+ SSD
- **CPU**: 2+ cores
- **Network**: Public IP with ports 80, 443, 5000 open

### 2. Software Stack
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 14+
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

## 🗄️ Database Setup

### 1. Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Run the setup script
\i /path/to/vps-setup.sql

# Exit PostgreSQL
\q
```

### 2. Security Configuration
```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf

# Update these settings:
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Edit authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line for local connections:
local   faceblog_production    faceblog_user                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 🔧 Application Deployment

### 1. Clone and Setup
```bash
# Clone repository
git clone <your-repo-url> /var/www/faceblog
cd /var/www/faceblog/backend

# Install dependencies
npm install --production

# Copy environment file
cp .env.vps .env

# Edit environment variables
nano .env
```

### 2. Environment Configuration
Update `.env` with your actual values:
```bash
# Database
DB_PASSWORD=your_actual_secure_password
JWT_SECRET=your_actual_jwt_secret_64_chars_minimum
CORS_ORIGINS=https://yourdomain.com

# Email
SMTP_HOST=your_smtp_server
SMTP_USER=your_email
SMTP_PASS=your_email_password

# API Keys
OPENAI_API_KEY=your_openai_key
```

### 3. Test Application
```bash
# Test database connection
node -e "require('./src/config/database-vps').testConnection()"

# Start application in test mode
npm start

# Check if running on port 5000
curl http://localhost:5000/api/health
```

## 🔄 Process Management with PM2

### 1. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'faceblog-api',
    script: './src/simple-server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/faceblog/error.log',
    out_file: '/var/log/faceblog/access.log',
    log_file: '/var/log/faceblog/combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};
```

### 2. Start with PM2
```bash
# Create log directory
sudo mkdir -p /var/log/faceblog
sudo chown -R $USER:$USER /var/log/faceblog

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

## 🌐 Nginx Reverse Proxy

### 1. Nginx Configuration
Create `/etc/nginx/sites-available/faceblog`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }

    # Static files (if any)
    location /uploads/ {
        alias /var/www/faceblog/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Enable Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/faceblog /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 📊 Monitoring & Logs

### 1. PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs faceblog-api

# Restart if needed
pm2 restart faceblog-api
```

### 2. System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Check system resources
htop

# Monitor database
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

## 🔧 Maintenance

### 1. Database Backup
```bash
# Create backup script
cat > /home/$USER/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/faceblog"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump faceblog_production > $BACKUP_DIR/faceblog_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "faceblog_*.sql" -mtime +7 -delete

echo "Backup completed: faceblog_$DATE.sql"
EOF

# Make executable
chmod +x /home/$USER/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-db.sh") | crontab -
```

### 2. Application Updates
```bash
# Update application
cd /var/www/faceblog
git pull origin main
cd backend
npm install --production

# Restart application
pm2 restart faceblog-api
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check logs
   sudo tail -f /var/log/postgresql/postgresql-14-main.log
   ```

2. **Application Won't Start**
   ```bash
   # Check PM2 logs
   pm2 logs faceblog-api --lines 50
   
   # Check environment variables
   pm2 env 0
   ```

3. **High Memory Usage**
   ```bash
   # Monitor memory
   free -h
   
   # Restart application
   pm2 restart faceblog-api
   ```

## ✅ Deployment Checklist

- [ ] VPS provisioned with required specs
- [ ] PostgreSQL installed and configured
- [ ] Database created with vps-setup.sql
- [ ] Node.js and dependencies installed
- [ ] Environment variables configured
- [ ] Application tested locally
- [ ] PM2 configured and running
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Backup script configured
- [ ] Monitoring setup
- [ ] DNS pointing to VPS IP

## 🎯 Performance Optimization

### Database Tuning
```sql
-- Add to postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### Application Tuning
```bash
# PM2 cluster mode for better performance
pm2 start ecosystem.config.js --instances max
```

---

**🎉 Your FaceBlog is now ready for production!**

Access your API at: `https://yourdomain.com/api/health`
