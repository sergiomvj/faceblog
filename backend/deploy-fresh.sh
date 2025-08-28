#!/bin/bash

# =====================================================
# FACEBLOG FRESH DEPLOYMENT SCRIPT
# Deploy to clean VPS after vps-clean-install.sh
# =====================================================

set -e

echo "🚀 Starting FaceBlog fresh deployment..."

# =====================================================
# STEP 1: EXTRACT APPLICATION FILES
# =====================================================
echo "📦 Extracting application files..."

cd /opt/faceblog
tar -xzf /tmp/faceblog-deploy.tar.gz --strip-components=1

echo "✅ Files extracted to /opt/faceblog"

# =====================================================
# STEP 2: INSTALL DEPENDENCIES
# =====================================================
echo "📦 Installing Node.js dependencies..."

npm install --production

echo "✅ Dependencies installed"

# =====================================================
# STEP 3: SETUP ENVIRONMENT
# =====================================================
echo "⚙️ Setting up environment..."

# Create production environment file
cat > .env.vps << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=faceblog_db
DB_USER=faceblog_user
DB_PASSWORD=faceblog_secure_2024!

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=faceblog_jwt_super_secret_key_2024_production
JWT_REFRESH_SECRET=faceblog_refresh_super_secret_key_2024_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://faceblog.top,https://admin.faceblog.top,https://api.faceblog.top

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/faceblog.log
EOF

echo "✅ Environment configured"

# =====================================================
# STEP 4: SETUP DATABASE SCHEMA
# =====================================================
echo "🐘 Setting up database schema..."

# Import schema
PGPASSWORD=faceblog_secure_2024! psql -h localhost -U faceblog_user -d faceblog_db -f supabase-schema.sql

echo "✅ Database schema imported"

# =====================================================
# STEP 5: CONFIGURE NGINX
# =====================================================
echo "🌐 Configuring Nginx..."

# Copy Nginx configuration
cp nginx-faceblog-top.conf /etc/nginx/sites-available/faceblog

# Enable site
ln -sf /etc/nginx/sites-available/faceblog /etc/nginx/sites-enabled/faceblog

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "✅ Nginx configured"

# =====================================================
# STEP 6: START APPLICATION WITH PM2
# =====================================================
echo "⚙️ Starting FaceBlog with PM2..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'faceblog',
    script: 'src/server-native.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '.env.vps',
    log_file: '/var/log/faceblog-combined.log',
    out_file: '/var/log/faceblog-out.log',
    error_file: '/var/log/faceblog-error.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ FaceBlog started with PM2"

# =====================================================
# STEP 7: SETUP LOG ROTATION
# =====================================================
echo "📝 Setting up log rotation..."

cat > /etc/logrotate.d/faceblog << 'EOF'
/var/log/faceblog*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

echo "✅ Log rotation configured"

# =====================================================
# STEP 8: VERIFICATION
# =====================================================
echo "🔍 Verifying deployment..."

# Wait for application to start
sleep 5

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Check if application is responding
echo "🌐 Testing application..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Application is responding"
else
    echo "❌ Application is not responding"
    pm2 logs faceblog --lines 20
fi

# Check Nginx status
echo "🌐 Nginx Status:"
systemctl status nginx --no-pager

# Check PostgreSQL status
echo "🐘 PostgreSQL Status:"
systemctl status postgresql --no-pager

# =====================================================
# COMPLETION
# =====================================================
echo ""
echo "🎉 FaceBlog Fresh Deployment Complete!"
echo ""
echo "📊 Service Status:"
pm2 status
echo ""
echo "🌐 URLs:"
echo "  Health Check: http://65.181.118.38:5000/api/health"
echo "  API Base: http://65.181.118.38:5000/api/"
echo ""
echo "📋 Next Steps:"
echo "1. Configure DNS: faceblog.top → 65.181.118.38"
echo "2. Test endpoints with CloudFlare"
echo "3. Add demo tenant data"
echo ""
echo "🔗 FaceBlog is ready for production!"
