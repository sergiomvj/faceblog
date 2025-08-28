#!/bin/bash

# =====================================================
# SETUP SSL FOR CUSTOM DOMAINS
# =====================================================

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-custom-ssl.sh blog.lifewayusa.app"
    exit 1
fi

echo "🔒 Setting up SSL for custom domain: $DOMAIN"

# Add domain to Nginx
cat >> /etc/nginx/sites-available/faceblog << EOF

# Custom domain: $DOMAIN
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Custom-Domain "true";
        
        # Custom domain headers
        add_header X-Tenant-Type "custom-domain" always;
        add_header X-Powered-By "FaceBlog" always;
    }
}

# HTTP redirect for $DOMAIN
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}
EOF

# Get SSL certificate
certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@faceblog.com.br

# Reload Nginx
nginx -t && systemctl reload nginx

echo "✅ SSL configured for $DOMAIN"
echo "🌐 Domain ready: https://$DOMAIN"
