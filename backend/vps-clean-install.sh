#!/bin/bash

# =====================================================
# VPS COMPLETE CLEAN & FRESH INSTALL - FaceBlog
# Remove all existing installations and start fresh
# =====================================================

set -e  # Exit on any error

echo "🧹 Starting VPS complete cleanup and fresh installation..."
echo "⚠️  This will remove ALL existing installations!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Installation cancelled"
    exit 1
fi

# =====================================================
# STEP 1: STOP ALL SERVICES
# =====================================================
echo "🛑 Stopping all services..."

# Stop PM2 processes
pm2 kill 2>/dev/null || true

# Stop services
systemctl stop nginx 2>/dev/null || true
systemctl stop postgresql 2>/dev/null || true
systemctl stop redis-server 2>/dev/null || true

echo "✅ Services stopped"

# =====================================================
# STEP 2: REMOVE ALL INSTALLATIONS
# =====================================================
echo "🗑️  Removing existing installations..."

# Remove Node.js and npm
apt-get remove --purge -y nodejs npm 2>/dev/null || true
rm -rf /usr/local/bin/node
rm -rf /usr/local/bin/npm
rm -rf /usr/local/lib/node_modules
rm -rf ~/.npm
rm -rf ~/.node-gyp

# Remove PostgreSQL completely
apt-get remove --purge -y postgresql* 2>/dev/null || true
rm -rf /var/lib/postgresql
rm -rf /etc/postgresql
rm -rf /var/log/postgresql

# Remove Nginx
apt-get remove --purge -y nginx* 2>/dev/null || true
rm -rf /etc/nginx
rm -rf /var/log/nginx
rm -rf /var/www

# Remove Redis
apt-get remove --purge -y redis* 2>/dev/null || true

# Remove PM2 globally
npm uninstall -g pm2 2>/dev/null || true

# Clean package cache
apt-get autoremove -y
apt-get autoclean

echo "✅ Old installations removed"

# =====================================================
# STEP 3: CLEAN APPLICATION DIRECTORIES
# =====================================================
echo "🧹 Cleaning application directories..."

# Remove application directories
rm -rf /opt/faceblog
rm -rf /var/www/faceblog
rm -rf /home/faceblog

# Remove any leftover config files
rm -rf /etc/systemd/system/faceblog*
rm -rf /etc/logrotate.d/faceblog

# Clean logs
rm -rf /var/log/faceblog*

echo "✅ Application directories cleaned"

# =====================================================
# STEP 4: UPDATE SYSTEM
# =====================================================
echo "🔄 Updating system packages..."

apt-get update
apt-get upgrade -y

echo "✅ System updated"

# =====================================================
# STEP 5: INSTALL NODE.JS 18.x
# =====================================================
echo "📦 Installing Node.js 18.x..."

# Install Node.js 18.x from NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node_version=$(node --version)
npm_version=$(npm --version)

echo "✅ Node.js installed: $node_version"
echo "✅ npm installed: $npm_version"

# =====================================================
# STEP 6: INSTALL POSTGRESQL 14
# =====================================================
echo "🐘 Installing PostgreSQL 14..."

apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo "✅ PostgreSQL installed and started"

# =====================================================
# STEP 7: INSTALL NGINX
# =====================================================
echo "🌐 Installing Nginx..."

apt-get install -y nginx

# Start Nginx
systemctl start nginx
systemctl enable nginx

echo "✅ Nginx installed and started"

# =====================================================
# STEP 8: INSTALL PM2
# =====================================================
echo "⚙️ Installing PM2..."

npm install -g pm2

# Configure PM2 startup
pm2 startup systemd -u root --hp /root

echo "✅ PM2 installed"

# =====================================================
# STEP 9: CONFIGURE POSTGRESQL
# =====================================================
echo "🔧 Configuring PostgreSQL..."

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE faceblog_db;
CREATE USER faceblog_user WITH ENCRYPTED PASSWORD 'faceblog_secure_2024!';
GRANT ALL PRIVILEGES ON DATABASE faceblog_db TO faceblog_user;
ALTER USER faceblog_user CREATEDB;
\q
EOF

echo "✅ PostgreSQL configured"

# =====================================================
# STEP 10: CONFIGURE FIREWALL
# =====================================================
echo "🔥 Configuring firewall..."

# Install ufw if not present
apt-get install -y ufw

# Reset firewall rules
ufw --force reset

# Configure firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp  # Node.js app

# Enable firewall
ufw --force enable

echo "✅ Firewall configured"

# =====================================================
# STEP 11: CREATE APPLICATION DIRECTORY
# =====================================================
echo "📁 Creating application directory..."

mkdir -p /opt/faceblog
cd /opt/faceblog

echo "✅ Application directory created"

# =====================================================
# STEP 12: SYSTEM VERIFICATION
# =====================================================
echo "🔍 Verifying installation..."

echo "📊 System Status:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  PostgreSQL: $(sudo -u postgres psql -c 'SELECT version();' | head -3 | tail -1)"
echo "  Nginx: $(nginx -v 2>&1)"
echo "  PM2: $(pm2 --version)"

echo ""
echo "🔧 Service Status:"
systemctl is-active postgresql && echo "  PostgreSQL: ✅ Active" || echo "  PostgreSQL: ❌ Inactive"
systemctl is-active nginx && echo "  Nginx: ✅ Active" || echo "  Nginx: ❌ Inactive"

echo ""
echo "🌐 Network Status:"
netstat -tlnp | grep :80 && echo "  Port 80: ✅ Open" || echo "  Port 80: ❌ Not listening"
netstat -tlnp | grep :5432 && echo "  PostgreSQL: ✅ Running" || echo "  PostgreSQL: ❌ Not running"

# =====================================================
# COMPLETION
# =====================================================
echo ""
echo "🎉 VPS Clean Installation Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Upload FaceBlog application files to /opt/faceblog/"
echo "2. Run: cd /opt/faceblog && npm install"
echo "3. Configure environment variables (.env.vps)"
echo "4. Import database schema"
echo "5. Configure Nginx virtual host"
echo "6. Start application with PM2"
echo ""
echo "🔗 Ready for FaceBlog deployment!"
