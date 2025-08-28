#!/bin/bash

# =====================================================
# FACEBLOG VPS DEPLOYMENT SCRIPT
# =====================================================

set -e  # Exit on any error

echo "🚀 FaceBlog VPS Deployment Starting..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="faceblog"
APP_DIR="/var/www/faceblog"
DB_NAME="faceblog_production"
DB_USER="faceblog_user"
DB_PASS="$(openssl rand -base64 32)"
JWT_SECRET="$(openssl rand -base64 64)"
JWT_REFRESH_SECRET="$(openssl rand -base64 64)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
}

# Update system
update_system() {
    log_info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    log_success "System updated"
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    log_success "Node.js $node_version and npm $npm_version installed"
}

# Install PostgreSQL
install_postgresql() {
    log_info "Installing PostgreSQL..."
    sudo apt install postgresql postgresql-contrib -y
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    log_success "PostgreSQL installed and started"
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

    # Run schema setup
    sudo -u postgres psql -d $DB_NAME -f vps-setup.sql
    
    log_success "Database setup completed"
}

# Install PM2
install_pm2() {
    log_info "Installing PM2..."
    sudo npm install -g pm2
    log_success "PM2 installed"
}

# Install Nginx
install_nginx() {
    log_info "Installing Nginx..."
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
    log_success "Nginx installed and started"
}

# Create application directory
setup_app_directory() {
    log_info "Setting up application directory..."
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
    log_success "Application directory created"
}

# Copy application files
copy_app_files() {
    log_info "Copying application files..."
    
    # Copy backend files
    cp -r src/ $APP_DIR/
    cp package.json $APP_DIR/
    cp vps-setup.sql $APP_DIR/
    
    # Create logs directory
    mkdir -p $APP_DIR/logs
    mkdir -p $APP_DIR/uploads
    
    log_success "Application files copied"
}

# Install dependencies
install_dependencies() {
    log_info "Installing application dependencies..."
    cd $APP_DIR
    npm install --production
    log_success "Dependencies installed"
}

# Create environment file
create_env_file() {
    log_info "Creating environment file..."
    
    cat > $APP_DIR/.env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_SSL=false
DB_MAX_CONNECTIONS=20

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
CORS_ORIGINS=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=$APP_DIR/uploads

# Logging
LOG_LEVEL=info
LOG_FILE=$APP_DIR/logs/app.log
EOF

    log_success "Environment file created"
}

# Create PM2 ecosystem file
create_pm2_config() {
    log_info "Creating PM2 configuration..."
    
    cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './src/server-native.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/error.log',
    out_file: './logs/access.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};
EOF

    log_success "PM2 configuration created"
}

# Configure Nginx
configure_nginx() {
    log_info "Configuring Nginx..."
    
    sudo tee /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # API Server
    server {
        listen 80;
        server_name api.faceblog.com.br;
        
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://localhost:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-API-Key" always;
        }
    }

    # Multi-tenant frontend (wildcard)
    server {
        listen 80;
        server_name *.faceblog.com.br;
        
        # Extract tenant from subdomain
        set $tenant "";
        if ($host ~* ^([^.]+)\.faceblog\.com\.br$) {
            set $tenant $1;
        }
        
        # Skip system subdomains
        if ($tenant ~* ^(api|admin|www)$) {
            return 404;
        }
        
        location / {
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Tenant $tenant;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Admin panel
    server {
        listen 80;
        server_name admin.faceblog.com.br;
        
        location / {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Main domain redirect
    server {
        listen 80;
        server_name faceblog.com.br www.faceblog.com.br;
        return 301 https://admin.faceblog.com.br$request_uri;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }

    # Static files
    location /uploads/ {
        alias $APP_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Default response
    location / {
        return 200 'FaceBlog API is running. Use /api/ endpoints.';
        add_header Content-Type text/plain;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    sudo nginx -t
    sudo systemctl reload nginx
    
    log_success "Nginx configured"
}

# Start application
start_application() {
    log_info "Starting application..."
    cd $APP_DIR
    
    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    log_success "Application started"
}

# Setup firewall
setup_firewall() {
    log_info "Configuring firewall..."
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw --force enable
    log_success "Firewall configured"
}

# Create backup script
create_backup_script() {
    log_info "Creating backup script..."
    
    cat > /home/$USER/backup-faceblog.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/faceblog"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump faceblog_production > $BACKUP_DIR/faceblog_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /var/www/faceblog uploads/

# Keep only last 7 days
find $BACKUP_DIR -name "faceblog_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup completed: faceblog_$DATE"
EOF

    chmod +x /home/$USER/backup-faceblog.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-faceblog.sh") | crontab -
    
    log_success "Backup script created"
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Wait for app to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
    
    # Test API endpoint
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        return 1
    fi
    
    log_success "Deployment test passed"
}

# Print deployment info
print_deployment_info() {
    echo ""
    echo "🎉 FaceBlog Deployment Completed!"
    echo "================================="
    echo ""
    echo "📋 Deployment Information:"
    echo "  Application: $APP_NAME"
    echo "  Directory: $APP_DIR"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASS"
    echo ""
    echo "🔐 JWT Secrets (save these securely):"
    echo "  JWT_SECRET: $JWT_SECRET"
    echo "  JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
    echo ""
    echo "🌐 Access URLs:"
    echo "  API Health: http://$(curl -s ifconfig.me)/health"
    echo "  API Base: http://$(curl -s ifconfig.me)/api/"
    echo ""
    echo "🛠️  Management Commands:"
    echo "  pm2 status                    # Check app status"
    echo "  pm2 logs $APP_NAME           # View logs"
    echo "  pm2 restart $APP_NAME        # Restart app"
    echo "  sudo systemctl status nginx  # Check Nginx"
    echo "  /home/$USER/backup-faceblog.sh # Manual backup"
    echo ""
    echo "📁 Important Files:"
    echo "  App: $APP_DIR"
    echo "  Logs: $APP_DIR/logs/"
    echo "  Uploads: $APP_DIR/uploads/"
    echo "  Environment: $APP_DIR/.env"
    echo ""
    echo "✅ FaceBlog is ready for production!"
}

# Main deployment function
main() {
    log_info "Starting FaceBlog VPS deployment..."
    
    check_root
    update_system
    install_nodejs
    install_postgresql
    install_pm2
    install_nginx
    setup_app_directory
    copy_app_files
    install_dependencies
    setup_database
    create_env_file
    create_pm2_config
    configure_nginx
    setup_firewall
    create_backup_script
    start_application
    test_deployment
    print_deployment_info
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
