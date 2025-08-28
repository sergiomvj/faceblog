#!/bin/bash

# Setup SSH Keys for FaceBlog VPS
# Este script configura autenticação por chave SSH para eliminar necessidade de senha

VPS_IP="65.181.118.38"
VPS_USER="root"
SSH_KEY_PATH="$HOME/.ssh/faceblog_vps"

echo "🔑 Configurando SSH Keys para FaceBlog VPS"
echo "=========================================="

# 1. Verificar se já existe chave SSH
if [ -f "$SSH_KEY_PATH" ]; then
    echo "[INFO] Chave SSH já existe em $SSH_KEY_PATH"
    read -p "Deseja recriar a chave? (y/N): " recreate
    if [[ $recreate =~ ^[Yy]$ ]]; then
        rm -f "$SSH_KEY_PATH" "$SSH_KEY_PATH.pub"
        echo "[INFO] Chave antiga removida"
    else
        echo "[INFO] Usando chave existente"
    fi
fi

# 2. Gerar nova chave SSH se não existir
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "[INFO] Gerando nova chave SSH..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "faceblog-deploy-$(date +%Y%m%d)"
    echo "[SUCCESS] Chave SSH gerada: $SSH_KEY_PATH"
fi

# 3. Verificar se a chave pública existe
if [ ! -f "$SSH_KEY_PATH.pub" ]; then
    echo "[ERROR] Arquivo de chave pública não encontrado: $SSH_KEY_PATH.pub"
    exit 1
fi

# 4. Mostrar a chave pública
echo ""
echo "📋 Chave pública gerada:"
echo "========================"
cat "$SSH_KEY_PATH.pub"
echo ""

# 5. Copiar chave para o VPS
echo "[INFO] Copiando chave pública para o VPS..."
echo "[INFO] Você precisará digitar a senha do VPS UMA ÚLTIMA VEZ"
echo ""

# Criar diretório .ssh no VPS se não existir
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "mkdir -p ~/.ssh && chmod 700 ~/.ssh"

# Copiar a chave pública
cat "$SSH_KEY_PATH.pub" | ssh "$VPS_USER@$VPS_IP" "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Chave SSH configurada no VPS!"
else
    echo "[ERROR] Falha ao configurar chave no VPS"
    exit 1
fi

# 6. Testar conexão sem senha
echo ""
echo "[INFO] Testando conexão SSH sem senha..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "echo 'Conexão SSH funcionando sem senha!'"

if [ $? -eq 0 ]; then
    echo "[SUCCESS] ✅ SSH configurado com sucesso!"
    echo ""
    echo "🎉 Agora você pode usar os scripts de deploy sem digitar senha!"
    echo ""
    echo "Para usar a chave SSH nos scripts de deploy, adicione esta linha:"
    echo "SSH_KEY=\"$SSH_KEY_PATH\""
    echo ""
    echo "Ou configure no seu ~/.ssh/config:"
    echo "Host faceblog-vps"
    echo "    HostName $VPS_IP"
    echo "    User $VPS_USER"
    echo "    IdentityFile $SSH_KEY_PATH"
    echo "    StrictHostKeyChecking no"
else
    echo "[ERROR] ❌ Falha no teste de conexão SSH"
    echo "Verifique se a chave foi copiada corretamente"
    exit 1
fi

echo ""
echo "🚀 Próximo passo: Execute o script de deploy sem precisar de senha!"
