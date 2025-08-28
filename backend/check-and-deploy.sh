#!/bin/bash

# FaceBlog Check and Deploy Script
# Verifica estrutura atual e faz deploy correto

set -e

echo "🔍 FaceBlog Check and Deploy - $(date)"
echo "======================================"

# Configurações
VPS_IP="65.181.118.38"
VPS_USER="root"

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

print_status "Conectando ao VPS..."

# 1. Verificar estrutura atual
print_status "Verificando estrutura atual do VPS..."
run_remote "
    echo '=== Estrutura de diretórios ==='
    ls -la /var/www/ || echo 'Diretório /var/www não encontrado'
    echo
    echo '=== Processos PM2 ==='
    pm2 list || echo 'PM2 não configurado'
    echo
    echo '=== Processos Node ==='
    ps aux | grep node || echo 'Nenhum processo Node encontrado'
    echo
    echo '=== Nginx sites ==='
    ls -la /etc/nginx/sites-enabled/ || echo 'Nginx não configurado'
    echo
    echo '=== Verificar portas ==='
    netstat -tulpn | grep :5000 || echo 'Porta 5000 não em uso'
    netstat -tulpn | grep :3000 || echo 'Porta 3000 não em uso'
"

print_status "Verificando se existe algum projeto FaceBlog..."
run_remote "
    find /var -name '*faceblog*' -type d 2>/dev/null || echo 'Nenhum diretório faceblog encontrado'
    find /home -name '*faceblog*' -type d 2>/dev/null || echo 'Nenhum diretório faceblog em /home'
    find /root -name '*faceblog*' -type d 2>/dev/null || echo 'Nenhum diretório faceblog em /root'
"

print_status "Verificando se há algum servidor rodando..."
run_remote "
    curl -s http://localhost:5000/health || echo 'Nenhum servidor na porta 5000'
    curl -s http://localhost:3000 || echo 'Nenhum servidor na porta 3000'
    curl -s http://localhost:8080 || echo 'Nenhum servidor na porta 8080'
"

echo
print_warning "Baseado na verificação acima, escolha uma opção:"
echo "1. Fazer deploy inicial completo (se não há nada instalado)"
echo "2. Atualizar instalação existente (se encontrou estrutura)"
echo "3. Apenas verificar logs e status"
echo
read -p "Escolha uma opção (1-3): " choice

case $choice in
    1)
        print_status "Iniciando deploy inicial completo..."
        
        # Criar estrutura de diretórios
        run_remote "
            mkdir -p /var/www/faceblog/backend/src
            mkdir -p /var/www/faceblog/frontend/src/pages
            mkdir -p /var/www/faceblog/frontend/src/components/Layout
            mkdir -p /var/www/html
            mkdir -p /var/backups/faceblog
        "
        
        # Copiar arquivos
        print_status "Copiando arquivos..."
        scp -o StrictHostKeyChecking=no "../backend/src/simple-server.js" $VPS_USER@$VPS_IP:"/var/www/faceblog/backend/src/"
        scp -o StrictHostKeyChecking=no "../frontend/src/pages/Settings.tsx" $VPS_USER@$VPS_IP:"/var/www/faceblog/frontend/src/pages/"
        scp -o StrictHostKeyChecking=no "../frontend/src/App.tsx" $VPS_USER@$VPS_IP:"/var/www/faceblog/frontend/src/"
        scp -o StrictHostKeyChecking=no "../frontend/src/components/Logo.tsx" $VPS_USER@$VPS_IP:"/var/www/faceblog/frontend/src/components/"
        scp -o StrictHostKeyChecking=no "../frontend/src/components/Layout/Sidebar.tsx" $VPS_USER@$VPS_IP:"/var/www/faceblog/frontend/src/components/Layout/"
        
        # Instalar dependências e iniciar
        run_remote "
            cd /var/www/faceblog/backend
            npm init -y
            npm install express cors @supabase/supabase-js dotenv
            
            # Criar .env
            cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=5000
NODE_ENV=production
EOF
            
            # Iniciar com PM2
            pm2 start src/simple-server.js --name faceblog-api
            pm2 save
            pm2 startup
        "
        
        print_success "Deploy inicial concluído!"
        ;;
        
    2)
        print_status "Atualizando instalação existente..."
        
        # Determinar localização atual
        CURRENT_DIR=$(run_remote "find /var -name 'simple-server.js' -type f 2>/dev/null | head -1 | dirname" || echo "")
        
        if [ -n "$CURRENT_DIR" ]; then
            print_status "Encontrado em: $CURRENT_DIR"
            
            # Fazer backup
            run_remote "cp $CURRENT_DIR/simple-server.js $CURRENT_DIR/simple-server.js.backup"
            
            # Copiar novo arquivo
            scp -o StrictHostKeyChecking=no "../backend/src/simple-server.js" $VPS_USER@$VPS_IP:"$CURRENT_DIR/"
            
            # Reiniciar serviço
            run_remote "pm2 restart all"
            
            print_success "Atualização concluída!"
        else
            print_error "Não foi possível encontrar instalação existente"
        fi
        ;;
        
    3)
        print_status "Verificando logs e status..."
        run_remote "
            echo '=== PM2 Logs ==='
            pm2 logs --lines 20 || echo 'PM2 não disponível'
            echo
            echo '=== System Logs ==='
            tail -20 /var/log/nginx/error.log 2>/dev/null || echo 'Nginx logs não disponíveis'
        "
        ;;
        
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

# Teste final
print_status "Testando conectividade..."
if run_remote "curl -s http://localhost:5000/health | grep -q 'OK'"; then
    print_success "✅ API funcionando na porta 5000"
else
    print_warning "⚠️ API não está respondendo na porta 5000"
fi

print_success "Script concluído!"
