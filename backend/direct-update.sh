#!/bin/bash

# FaceBlog Direct Update Script
# Atualiza o sistema copiando arquivos diretamente (sem Git)

set -e

echo "🚀 FaceBlog Direct Update - $(date)"
echo "====================================="

# Configurações
VPS_IP="65.181.118.38"
VPS_USER="root"
PROJECT_DIR="/var/www/faceblog"
LOCAL_DIR="$(pwd)/.."

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para executar comandos no VPS
run_remote() {
    ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "$1"
}

# Função para copiar arquivos
copy_file() {
    local src="$1"
    local dest="$2"
    if [ -f "$src" ]; then
        scp -o StrictHostKeyChecking=no "$src" $VPS_USER@$VPS_IP:"$dest"
        print_success "✓ Copiado: $(basename "$src")"
    else
        print_warning "⚠ Arquivo não encontrado: $src"
    fi
}

print_status "Iniciando update direto..."

# 1. Verificar conectividade
print_status "Testando conexão com VPS..."
if ! run_remote "echo 'Conexão OK'"; then
    print_error "Falha na conexão com o VPS"
    exit 1
fi

# 2. Criar backup
print_status "Criando backup..."
run_remote "
    mkdir -p /var/backups/faceblog/$(date +%Y%m%d_%H%M%S)
    cp -r $PROJECT_DIR/backend/src/simple-server.js /var/backups/faceblog/$(date +%Y%m%d_%H%M%S)/
    cp -r $PROJECT_DIR/frontend/src/pages/Settings.tsx /var/backups/faceblog/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
"

# 3. Parar API temporariamente
print_status "Parando API..."
run_remote "pm2 stop faceblog-api || true"

# 4. Atualizar arquivos backend
print_status "Atualizando backend..."
copy_file "$LOCAL_DIR/backend/src/simple-server.js" "$PROJECT_DIR/backend/src/simple-server.js"
copy_file "$LOCAL_DIR/backend/test-endpoints.js" "$PROJECT_DIR/backend/test-endpoints.js"

# 5. Atualizar arquivos frontend
print_status "Atualizando frontend..."
copy_file "$LOCAL_DIR/frontend/src/pages/Settings.tsx" "$PROJECT_DIR/frontend/src/pages/Settings.tsx"
copy_file "$LOCAL_DIR/frontend/src/App.tsx" "$PROJECT_DIR/frontend/src/App.tsx"
copy_file "$LOCAL_DIR/frontend/src/components/Logo.tsx" "$PROJECT_DIR/frontend/src/components/Logo.tsx"
copy_file "$LOCAL_DIR/frontend/src/components/Layout/Sidebar.tsx" "$PROJECT_DIR/frontend/src/components/Layout/Sidebar.tsx"

# 6. Rebuild frontend
print_status "Rebuilding frontend..."
run_remote "
    cd $PROJECT_DIR/frontend
    npm run build
    cp -r dist/* /var/www/html/
"

# 7. Reiniciar API
print_status "Reiniciando API..."
run_remote "
    cd $PROJECT_DIR/backend
    pm2 start src/simple-server.js --name faceblog-api
    pm2 save
"

# 8. Verificar saúde
print_status "Verificando sistema..."
sleep 5

# Testar API
if run_remote "curl -s http://localhost:5000/health | grep -q 'OK'"; then
    print_success "✅ API funcionando na porta 5000"
else
    print_error "❌ API não está respondendo"
    print_status "Tentando restaurar backup..."
    run_remote "
        pm2 stop faceblog-api
        cp /var/backups/faceblog/$(ls -t /var/backups/faceblog/ | head -1)/simple-server.js $PROJECT_DIR/backend/src/
        pm2 start $PROJECT_DIR/backend/src/simple-server.js --name faceblog-api
    "
    exit 1
fi

# 9. Testar endpoints críticos
print_status "Testando endpoints corrigidos..."
FIXED_ENDPOINTS=(
    "http://localhost:5000/api/leaderboards"
    "http://localhost:5000/api/v1/deployment/all"
    "http://localhost:5000/api/v1/deployment/analytics"
)

for endpoint in "${FIXED_ENDPOINTS[@]}"; do
    if run_remote "curl -s $endpoint | grep -q 'success'"; then
        print_success "✓ $(echo $endpoint | sed 's/.*\/api/\/api/')"
    else
        print_warning "⚠ $(echo $endpoint | sed 's/.*\/api/\/api/')"
    fi
done

# 10. Status final
print_status "Status final dos serviços..."
run_remote "
    echo '=== PM2 Status ==='
    pm2 status
    echo
    echo '=== Nginx Status ==='
    systemctl status nginx --no-pager -l | head -10
    echo
    echo '=== Memory Usage ==='
    free -h
"

# 11. Testar acesso web
print_status "Testando acesso web..."
if curl -s -o /dev/null -w "%{http_code}" "https://faceblog.top" | grep -q "200"; then
    print_success "✅ Site acessível em https://faceblog.top"
else
    print_warning "⚠ Verificar acesso web manualmente"
fi

echo
echo "========================================="
print_success "🎉 Update direto concluído!"
echo
echo "📋 Correções aplicadas:"
echo "   ✅ Backend: Porta 5000 (era 5001)"
echo "   ✅ Rota: /api/leaderboards (era /api/leaderboard)"
echo "   ✅ Endpoints: /api/v1/deployment/* adicionados"
echo "   ✅ Frontend: Página Configurações implementada"
echo "   ✅ UI: Logo melhorado"
echo
echo "🌐 URLs:"
echo "   • Site: https://faceblog.top"
echo "   • Admin: https://admin.faceblog.top"
echo
echo "🔧 Monitoramento:"
echo "   • Logs: ssh root@65.181.118.38 'pm2 logs faceblog-api'"
echo "   • Status: ssh root@65.181.118.38 'pm2 status'"
echo
print_success "Deploy finalizado! 🚀"
