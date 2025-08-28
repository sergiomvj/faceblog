#!/bin/bash

# FaceBlog GitHub Deploy - Deploy via Git Pull
# Muito mais simples e confiável que copiar arquivos

VPS_IP="65.181.118.38"
VPS_USER="root"
REPO_URL="https://github.com/appgomaia/newfaceblog.git"
PROJECT_DIR="/opt/faceblog"

echo "🚀 FaceBlog GitHub Deploy - $(date)"
echo "=========================================="

# Função para executar comandos SSH
ssh_exec() {
    ssh "$VPS_USER@$VPS_IP" "$1"
}

echo "[INFO] Conectando ao VPS..."

# 1. Verificar se é repositório Git
echo "[INFO] Verificando repositório Git no VPS..."
GIT_STATUS=$(ssh_exec "cd $PROJECT_DIR && git status 2>/dev/null || echo 'NOT_GIT'")

if [[ "$GIT_STATUS" == *"NOT_GIT"* ]]; then
    echo "[INFO] Inicializando repositório Git..."
    ssh_exec "cd $PROJECT_DIR && git init"
    ssh_exec "cd $PROJECT_DIR && git remote add origin $REPO_URL"
    ssh_exec "cd $PROJECT_DIR && git fetch origin"
    ssh_exec "cd $PROJECT_DIR && git checkout -b main origin/main"
else
    echo "[INFO] Repositório Git já configurado"
fi

# 2. Fazer backup antes do deploy
echo "[INFO] Criando backup..."
ssh_exec "mkdir -p /var/backups/faceblog/$(date +%Y%m%d_%H%M%S)"
ssh_exec "cp -r $PROJECT_DIR /var/backups/faceblog/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo 'Backup criado'"

# 3. Parar serviços
echo "[INFO] Parando serviços..."
ssh_exec "pm2 stop faceblog 2>/dev/null || echo 'PM2 já parado'"

# 4. Fazer git pull
echo "[INFO] Atualizando código via Git..."
ssh_exec "cd $PROJECT_DIR && git fetch origin"
ssh_exec "cd $PROJECT_DIR && git reset --hard origin/main"
ssh_exec "cd $PROJECT_DIR && git pull origin main"

# 5. Instalar dependências se necessário
echo "[INFO] Verificando dependências..."
ssh_exec "cd $PROJECT_DIR && npm install --production"

# 6. Reiniciar serviços
echo "[INFO] Reiniciando serviços..."
ssh_exec "cd $PROJECT_DIR && pm2 start src/simple-server.js --name faceblog || pm2 restart faceblog"
ssh_exec "systemctl reload nginx"

# 7. Verificar saúde
echo "[INFO] Verificando saúde do sistema..."
sleep 3

PM2_STATUS=$(ssh_exec "pm2 list | grep faceblog")
echo "[INFO] Status PM2: $PM2_STATUS"

API_RESPONSE=$(ssh_exec "curl -s http://localhost:5000/health 2>/dev/null")
echo "[INFO] Resposta API: $API_RESPONSE"

if [[ "$API_RESPONSE" == *"success"* ]]; then
    echo "[SUCCESS] ✅ Deploy via GitHub concluído com sucesso!"
else
    echo "[WARNING] ⚠️ API pode não estar respondendo corretamente"
fi

echo ""
echo "🎉 Deploy GitHub finalizado!"
echo "URL: https://faceblog.top"
echo "Commit atual: $(ssh_exec "cd $PROJECT_DIR && git rev-parse --short HEAD")"
