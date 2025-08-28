# 🚀 FaceBlog VPS Deployment Instructions

## 📋 Prerequisites

1. **VPS Requirements**:
   - Ubuntu 20.04+ or Debian 11+
   - 2GB+ RAM (4GB recommended)
   - 20GB+ storage
   - Root/sudo access

2. **Domain (Optional)**:
   - Point your domain to VPS IP
   - For SSL certificate setup

## 🔧 Quick Deployment

### Step 1: Connect to VPS
```bash
ssh root@your-vps-ip
# or
ssh your-user@your-vps-ip
```

### Step 2: Upload Files
```bash
# Option A: Using SCP
scp -r backend/ user@your-vps-ip:/tmp/faceblog/

# Option B: Using Git
git clone your-repo-url /tmp/faceblog
cd /tmp/faceblog/backend
```

### Step 3: Run Deployment Script
```bash
cd /tmp/faceblog/backend
chmod +x deploy-vps.sh
./deploy-vps.sh
```

## 🎯 What the Script Does

1. **System Setup**:
   - Updates packages
   - Installs Node.js 18
   - Installs PostgreSQL 14+
   - Installs PM2 & Nginx

2. **Database Setup**:
   - Creates `faceblog_production` database
   - Creates `faceblog_user` with secure password
   - Runs schema from `vps-setup.sql`

3. **Application Setup**:
   - Copies files to `/var/www/faceblog`
   - Installs dependencies
   - Creates production `.env` file
   - Configures PM2 for clustering

4. **Web Server**:
   - Configures Nginx reverse proxy
   - Sets up security headers
   - Enables firewall (ports 80, 443, SSH)

5. **Monitoring**:
   - Creates backup script (runs daily at 2 AM)
   - Sets up PM2 auto-restart
   - Configures log rotation

## 🔐 Security Features

- **Generated secrets**: JWT keys auto-generated
- **Database password**: Random 32-char password
- **Firewall**: Only necessary ports open
- **Security headers**: HSTS, XSS protection, etc.
- **Process isolation**: PM2 cluster mode

## 📊 Post-Deployment

### Check Status
```bash
# Application status
pm2 status
pm2 logs faceblog

# Database status
sudo systemctl status postgresql

# Web server status
sudo systemctl status nginx

# Test API
curl http://your-vps-ip/health
curl http://your-vps-ip/api/health
```

### View Credentials
The deployment script will output:
- Database password
- JWT secrets
- Access URLs
- Management commands

**⚠️ Save these credentials securely!**

## 🛠️ Management Commands

```bash
# Application
pm2 restart faceblog    # Restart app
pm2 stop faceblog       # Stop app
pm2 start faceblog      # Start app
pm2 logs faceblog       # View logs

# Database
sudo -u postgres psql faceblog_production  # Access DB
/home/user/backup-faceblog.sh              # Manual backup

# Web Server
sudo systemctl reload nginx     # Reload Nginx
sudo nginx -t                   # Test config
```

## 🔄 Updates

To update the application:
```bash
cd /var/www/faceblog
git pull origin main  # If using Git
npm install --production
pm2 restart faceblog
```

## 🆘 Troubleshooting

### App Won't Start
```bash
pm2 logs faceblog --lines 50
cat /var/www/faceblog/logs/error.log
```

### Database Issues
```bash
sudo systemctl status postgresql
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Nginx Issues
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Port Already in Use
```bash
sudo netstat -tulpn | grep :5000
sudo kill -9 PID_NUMBER
pm2 restart faceblog
```

## 🌐 SSL Certificate (Optional)

After deployment, add SSL:
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 📁 File Structure

```
/var/www/faceblog/
├── src/                    # Application code
├── logs/                   # Application logs
├── uploads/                # File uploads
├── .env                    # Environment variables
├── ecosystem.config.js     # PM2 configuration
└── package.json           # Dependencies
```

## 🎉 Success Indicators

✅ **Deployment Successful** when you see:
- PM2 shows app as "online"
- Health check returns 200
- Nginx serves requests
- Database accepts connections

Your FaceBlog API will be available at:
- **Health**: `http://your-vps-ip/health`
- **API**: `http://your-vps-ip/api/`

## 📞 Support

If deployment fails:
1. Check the error logs
2. Verify VPS meets requirements
3. Ensure all ports are open
4. Check domain DNS settings (if using domain)

**Ready to deploy? Run the script and your FaceBlog will be live in minutes!**
