#!/bin/bash

# FaceBlog Git Update Script
# Atualiza o sistema via Git pull no VPS

set -e

echo "🔄 FaceBlog Git Update - $(date)"
echo "=================================="

# Configurações
VPS_IP="65.181.118.38"
VPS_USER="root"
PROJECT_DIR="/var/www/faceblog"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Função para executar comandos no VPS
run_remote() {
    ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "$1"
}

print_status "Conectando ao VPS..."

# 1. Fazer backup rápido
print_status "Backup rápido..."
run_remote "cp $PROJECT_DIR/backend/src/simple-server.js $PROJECT_DIR/backend/src/simple-server.js.backup"

# 2. Fazer git pull
print_status "Atualizando código via Git..."
run_remote "
    cd $PROJECT_DIR
    git stash
    git pull origin main
    git stash pop || true
"

# 3. Instalar dependências se necessário
print_status "Verificando dependências..."
run_remote "
    cd $PROJECT_DIR/backend
    npm install --production
    
    cd $PROJECT_DIR/frontend  
    npm install --production
"

# 4. Rebuild frontend
print_status "Rebuilding frontend..."
run_remote "
    cd $PROJECT_DIR/frontend
    npm run build
    cp -r dist/* /var/www/html/
"

# 5. Reiniciar API
print_status "Reiniciando API..."
run_remote "
    pm2 restart faceblog-api || pm2 start $PROJECT_DIR/backend/src/simple-server.js --name faceblog-api
    pm2 save
"

# 6. Reload Nginx
print_status "Recarregando Nginx..."
run_remote "systemctl reload nginx"

# 7. Verificar saúde
print_status "Verificando saúde do sistema..."
sleep 3

if run_remote "curl -s http://localhost:5000/health | grep -q 'OK'"; then
    print_success "✅ API funcionando na porta 5000"
else
    print_warning "⚠️ API pode ter problemas"
fi

# Testar endpoints principais
print_status "Testando endpoints principais..."
ENDPOINTS=("articles" "categories" "tags" "users" "tenants")

for endpoint in "${ENDPOINTS[@]}"; do
    if run_remote "curl -s http://localhost:5000/api/$endpoint | grep -q 'success'"; then
        print_success "✓ /api/$endpoint"
    else
        print_warning "⚠ /api/$endpoint"
    fi
done

# Status final
run_remote "
    echo '=== PM2 Status ==='
    pm2 status
    echo
    echo '=== Latest Commits ==='
    cd $PROJECT_DIR && git log --oneline -5
"

print_success "🎉 Update via Git concluído!"
echo
echo "🌐 Acesse: https://faceblog.top"
echo "🔧 Monitorar: ssh $VPS_USER@$VPS_IP 'pm2 logs faceblog-api'"
