#!/bin/bash

# =====================================================
# CHECK VPS STATUS - Non-interactive
# =====================================================

echo "🔍 Checking VPS status..."

# Check if script is still running
if pgrep -f "vps-clean-install.sh" > /dev/null; then
    echo "⏳ Clean install script is still running"
    echo "Process ID: $(pgrep -f vps-clean-install.sh)"
    echo "Running time: $(ps -o etime= -p $(pgrep -f vps-clean-install.sh))"
else
    echo "✅ Clean install script completed"
fi

echo ""
echo "📊 Current System Status:"

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: Not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: Not installed"
fi

# Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL: Running"
else
    echo "❌ PostgreSQL: Not running"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Running"
else
    echo "❌ Nginx: Not running"
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    echo "✅ PM2: $(pm2 --version)"
else
    echo "❌ PM2: Not installed"
fi

echo ""
echo "📁 Directory Status:"
if [ -d "/opt/faceblog" ]; then
    echo "✅ /opt/faceblog exists"
else
    echo "❌ /opt/faceblog does not exist"
fi

echo ""
echo "🌐 Network Status:"
netstat -tlnp | grep :80 && echo "✅ Port 80: Open" || echo "❌ Port 80: Not listening"
netstat -tlnp | grep :5432 && echo "✅ PostgreSQL: Listening" || echo "❌ PostgreSQL: Not listening"

echo ""
echo "🔍 Status check complete"
