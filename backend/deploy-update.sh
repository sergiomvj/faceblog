#!/bin/bash

# FaceBlog Update Deployment Script
# Atualiza o sistema no VPS com as correções implementadas

set -e

echo "🚀 FaceBlog Update Deployment - $(date)"
echo "=================================================="

# Configurações
VPS_IP="65.181.118.38"
VPS_USER="root"
DOMAIN="faceblog.top"
PROJECT_DIR="/var/www/faceblog"
BACKUP_DIR="/var/backups/faceblog"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para executar comandos no VPS
run_remote() {
    ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "$1"
}

# Função para copiar arquivos para o VPS
copy_to_vps() {
    scp -o StrictHostKeyChecking=no -r "$1" $VPS_USER@$VPS_IP:"$2"
}

print_status "Iniciando processo de atualização..."

# 1. Criar backup antes da atualização
print_status "Criando backup do sistema atual..."
run_remote "
    mkdir -p $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)
    cp -r $PROJECT_DIR $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/
    pg_dump faceblog > $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/database_backup.sql
"
print_success "Backup criado com sucesso"

# 2. Parar serviços
print_status "Parando serviços..."
run_remote "
    pm2 stop all
    systemctl stop nginx
"
print_success "Serviços parados"

# 3. Atualizar código backend
print_status "Atualizando código backend..."
copy_to_vps "../backend/src/simple-server.js" "$PROJECT_DIR/backend/src/"
copy_to_vps "../backend/test-endpoints.js" "$PROJECT_DIR/backend/"

# 4. Atualizar código frontend
print_status "Atualizando código frontend..."
copy_to_vps "../frontend/src/pages/Settings.tsx" "$PROJECT_DIR/frontend/src/pages/"
copy_to_vps "../frontend/src/App.tsx" "$PROJECT_DIR/frontend/src/"
copy_to_vps "../frontend/src/components/Logo.tsx" "$PROJECT_DIR/frontend/src/components/"
copy_to_vps "../frontend/src/components/Layout/Sidebar.tsx" "$PROJECT_DIR/frontend/src/components/Layout/"

# 5. Rebuild frontend
print_status "Fazendo rebuild do frontend..."
run_remote "
    cd $PROJECT_DIR/frontend
    npm run build
    cp -r dist/* /var/www/html/
"
print_success "Frontend atualizado"

# 6. Verificar dependências do backend
print_status "Verificando dependências do backend..."
run_remote "
    cd $PROJECT_DIR/backend
    npm install
"

# 7. Reiniciar serviços
print_status "Reiniciando serviços..."
run_remote "
    cd $PROJECT_DIR/backend
    pm2 start src/simple-server.js --name faceblog-api
    systemctl start nginx
    systemctl reload nginx
"
print_success "Serviços reiniciados"

# 8. Verificar se tudo está funcionando
print_status "Verificando saúde do sistema..."
sleep 5

# Testar API
if run_remote "curl -s http://localhost:5000/health | grep -q 'OK'"; then
    print_success "API respondendo corretamente na porta 5000"
else
    print_error "API não está respondendo"
    exit 1
fi

# Testar alguns endpoints críticos
print_status "Testando endpoints críticos..."
ENDPOINTS=(
    "http://localhost:5000/api/articles"
    "http://localhost:5000/api/categories" 
    "http://localhost:5000/api/tags"
    "http://localhost:5000/api/leaderboards"
    "http://localhost:5000/api/v1/deployment/all"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if run_remote "curl -s $endpoint | grep -q 'success'"; then
        print_success "✓ $endpoint"
    else
        print_warning "⚠ $endpoint pode ter problemas"
    fi
done

# 9. Testar acesso web
print_status "Testando acesso web..."
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200"; then
    print_success "Site acessível em https://$DOMAIN"
else
    print_warning "Site pode ter problemas de acesso"
fi

# 10. Mostrar status final
print_status "Verificando status dos serviços..."
run_remote "
    echo '=== PM2 Status ==='
    pm2 status
    echo
    echo '=== Nginx Status ==='
    systemctl status nginx --no-pager -l
    echo
    echo '=== Disk Usage ==='
    df -h
    echo
    echo '=== Memory Usage ==='
    free -h
"

echo
echo "=================================================="
print_success "🎉 Atualização concluída com sucesso!"
echo
echo "📋 Resumo das atualizações aplicadas:"
echo "   ✅ Backend: Porta corrigida para 5000"
echo "   ✅ API: Rotas /api/leaderboards padronizada"
echo "   ✅ Endpoints: /api/v1/deployment/* adicionados"
echo "   ✅ Frontend: Página de Configurações implementada"
echo "   ✅ UI: Logo melhorado e alinhado"
echo
echo "🌐 URLs de acesso:"
echo "   • Site: https://$DOMAIN"
echo "   • Admin: https://admin.$DOMAIN"
echo "   • API: https://api.$DOMAIN"
echo
echo "🔧 Para monitorar:"
echo "   • Logs API: ssh $VPS_USER@$VPS_IP 'pm2 logs faceblog-api'"
echo "   • Status: ssh $VPS_USER@$VPS_IP 'pm2 status'"
echo "   • Nginx: ssh $VPS_USER@$VPS_IP 'tail -f /var/log/nginx/error.log'"
echo
print_success "Deploy finalizado! 🚀"
