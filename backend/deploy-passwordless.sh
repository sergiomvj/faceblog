#!/bin/bash

# FaceBlog Deploy Passwordless - Usando SSH Keys
# Deploy completo sem necessidade de senha

VPS_IP="65.181.118.38"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/faceblog_vps"
PROJECT_DIR="/opt/faceblog"
BACKUP_DIR="/var/backups/faceblog"

echo "🚀 FaceBlog Deploy Passwordless - $(date)"
echo "=========================================="

# Verificar se a chave SSH existe
if [ ! -f "$SSH_KEY" ]; then
    echo "[ERROR] Chave SSH não encontrada: $SSH_KEY"
    echo "Execute primeiro: bash setup-ssh-keys.sh"
    exit 1
fi

# Função para executar comandos SSH sem senha
ssh_exec() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "$1"
}

# Função para copiar arquivos via SCP sem senha
scp_copy() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r "$1" "$VPS_USER@$VPS_IP:$2"
}

# 1. Testar conexão
echo "[INFO] Testando conexão SSH..."
ssh_exec "echo 'Conexão OK'"
if [ $? -ne 0 ]; then
    echo "[ERROR] Falha na conexão SSH. Verifique as chaves."
    exit 1
fi

# 2. Criar backup
echo "[INFO] Criando backup..."
ssh_exec "mkdir -p $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
ssh_exec "cp -r $PROJECT_DIR $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo 'Backup parcial criado'"

# 3. Parar serviços
echo "[INFO] Parando serviços..."
ssh_exec "pm2 stop faceblog 2>/dev/null || echo 'PM2 process não encontrado'"
ssh_exec "systemctl stop nginx 2>/dev/null || echo 'Nginx já parado'"

# 4. Criar estrutura de diretórios
echo "[INFO] Preparando estrutura..."
ssh_exec "mkdir -p $PROJECT_DIR/src"
ssh_exec "mkdir -p /var/www/faceblog/frontend/build"

# 5. Copiar arquivos do backend
echo "[INFO] Copiando backend..."
scp_copy "../backend/src/simple-server.js" "$PROJECT_DIR/src/"
scp_copy "../backend/package.json" "$PROJECT_DIR/"
scp_copy "../backend/.env.example" "$PROJECT_DIR/.env"

# 6. Copiar arquivos do frontend
echo "[INFO] Copiando frontend..."
if [ -d "../frontend/build" ]; then
    scp_copy "../frontend/build/*" "/var/www/faceblog/frontend/build/"
else
    echo "[WARNING] Frontend build não encontrado, copiando src..."
    scp_copy "../frontend/src" "/var/www/faceblog/frontend/"
    scp_copy "../frontend/package.json" "/var/www/faceblog/frontend/"
fi

# 7. Instalar dependências
echo "[INFO] Instalando dependências..."
ssh_exec "cd $PROJECT_DIR && npm install --production"

# 8. Configurar variáveis de ambiente
echo "[INFO] Configurando environment..."
ssh_exec "cd $PROJECT_DIR && sed -i 's/PORT=5001/PORT=5000/g' .env"

# 9. Iniciar serviços
echo "[INFO] Iniciando serviços..."
ssh_exec "cd $PROJECT_DIR && pm2 start src/simple-server.js --name faceblog"
ssh_exec "systemctl start nginx"
ssh_exec "systemctl reload nginx"

# 10. Verificar saúde
echo "[INFO] Verificando saúde do sistema..."
sleep 3

# Verificar PM2
PM2_STATUS=$(ssh_exec "pm2 list | grep faceblog | grep online")
if [ -n "$PM2_STATUS" ]; then
    echo "[SUCCESS] ✅ Backend online"
else
    echo "[WARNING] ⚠️ Backend pode não estar funcionando"
fi

# Verificar Nginx
NGINX_STATUS=$(ssh_exec "systemctl is-active nginx")
if [ "$NGINX_STATUS" = "active" ]; then
    echo "[SUCCESS] ✅ Nginx ativo"
else
    echo "[WARNING] ⚠️ Nginx não está ativo"
fi

# Verificar API
API_RESPONSE=$(ssh_exec "curl -s http://localhost:5000/health 2>/dev/null")
if [[ "$API_RESPONSE" == *"success"* ]]; then
    echo "[SUCCESS] ✅ API respondendo"
else
    echo "[WARNING] ⚠️ API não está respondendo corretamente"
fi

# 11. Mostrar logs recentes
echo ""
echo "[INFO] Logs recentes do PM2:"
ssh_exec "pm2 logs faceblog --lines 5"

echo ""
echo "🎉 Deploy concluído!"
echo "URL: https://faceblog.top"
echo "API: https://faceblog.top/api/health"
echo ""
echo "Para verificar logs: ssh -i $SSH_KEY $VPS_USER@$VPS_IP 'pm2 logs faceblog'"
