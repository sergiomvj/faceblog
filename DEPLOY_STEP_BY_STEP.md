# 🚀 FaceBlog - Passo a Passo para Deploy

## Visão Geral

Este guia apresenta **3 métodos** para fazer deploy do FaceBlog no ambiente Portainer + Traefik + Docker Swarm:

1. **GitHub Actions (Automático)** - Recomendado para produção
2. **Portainer Stack (Manual)** - Deploy direto via interface
3. **Docker CLI (Manual)** - Deploy via linha de comando

---

## 📋 Pré-requisitos

- [ ] **Docker Swarm** inicializado
- [ ] **Traefik** rodando com rede `FBRnet`
- [ ] **Portainer** configurado (se usando método 2)
- [ ] **Domínios** apontando para o servidor:
  - `api.fbrlive.xyz` → Backend
  - `blog.fbrlive.xyz` → Frontend
- [ ] **Registry** configurado (se usando imagens customizadas)

---

## 🔧 Método 1: GitHub Actions (Automático)

### 1.1 Configurar Secrets no GitHub

Vá em **Settings → Secrets and Variables → Actions** e adicione:

```
PORTAINER_WEBHOOK_URL=https://portainer.fbrlive.xyz/api/webhooks/your-webhook-id
```

**OU** para deploy via SSH:

```
SSH_HOST=your-server.com
SSH_USER=deploy
SSH_KEY=-----BEGIN PRIVATE KEY-----...
SERVICE_NAME=faceblog_faceblog-backend
STACK_NAME=faceblog
```

### 1.2 Ajustar Workflow

Edite `.github/workflows/deploy.yaml`:

```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  APP_NAME: faceblog
  DEPLOY_DOMAIN: api.fbrlive.xyz
  INTERNAL_PORT: "5000"
```

### 1.3 Deploy Automático

```bash
# Fazer push para main
git add .
git commit -m "Deploy: versão 1.0.0"
git push origin main
```

O GitHub Actions irá:
- ✅ Buildar as imagens
- ✅ Fazer push para o registry
- ✅ Atualizar o serviço via webhook/SSH
- ✅ Verificar health check
- ✅ Rollback automático se falhar

---

## 🐳 Método 2: Portainer Stack

### 2.1 Preparar Imagens

```bash
# Buildar e fazer push das imagens
./build-and-push.sh

# OU manualmente:
cd backend
docker build -t registry.fbrlive.xyz/faceblog-backend:$(date +%Y-%m-%d) .
docker push registry.fbrlive.xyz/faceblog-backend:$(date +%Y-%m-%d)

cd ../frontend
docker build -t registry.fbrlive.xyz/faceblog-frontend:$(date +%Y-%m-%d) .
docker push registry.fbrlive.xyz/faceblog-frontend:$(date +%Y-%m-%d)
```

### 2.2 Configurar Environment

Crie arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
nano .env
```

**Variáveis obrigatórias:**
```env
POSTGRES_PASSWORD=sua_senha_super_segura
REDIS_PASSWORD=sua_senha_redis_segura
JWT_SECRET=sua_chave_jwt_minimo_32_caracteres
```

### 2.3 Deploy via Portainer

1. **Acesse Portainer** → **Stacks** → **Add Stack**
2. **Nome**: `faceblog`
3. **Build Method**: Upload
4. **Upload** o arquivo `docker-compose.yml`
5. **Environment Variables**: Cole o conteúdo do `.env`
6. **Deploy the Stack**

### 2.4 Verificar Deploy

```bash
# Verificar serviços
curl -I https://api.fbrlive.xyz/health
curl -I https://blog.fbrlive.xyz/health

# Logs via Portainer ou CLI
docker service logs faceblog_faceblog-backend
docker service logs faceblog_faceblog-frontend
```

---

## 💻 Método 3: Docker CLI (Manual)

### 3.1 Inicializar Swarm (se necessário)

```bash
# No manager node
docker swarm init

# Criar rede externa
docker network create --driver overlay FBRnet
```

### 3.2 Preparar Environment

```bash
# Criar .env
cp .env.example .env
nano .env

# Buildar imagens localmente (opcional)
docker build -t faceblog-backend:latest ./backend
docker build -t faceblog-frontend:latest ./frontend
```

### 3.3 Deploy Stack

```bash
# Deploy da stack
docker stack deploy -c docker-compose.yml faceblog

# Verificar serviços
docker stack services faceblog
docker stack ps faceblog
```

### 3.4 Monitoramento

```bash
# Logs em tempo real
docker service logs -f faceblog_faceblog-backend
docker service logs -f faceblog_faceblog-frontend

# Status dos serviços
docker service ls
docker service ps faceblog_faceblog-backend

# Health checks
curl https://api.fbrlive.xyz/health
curl https://blog.fbrlive.xyz/health
```

---

## 🗄️ Configuração do Banco de Dados

### 4.1 Executar Migrações

```bash
# Via Docker Swarm
docker exec -it $(docker ps -q -f name=faceblog_faceblog-backend) npm run migrate:up

# Via Portainer (Terminal do container)
npm run migrate:up

# Verificar status
npm run migrate:status
```

### 4.2 Seed Inicial (Opcional)

```bash
# Carregar dados iniciais
docker exec -it $(docker ps -q -f name=faceblog_faceblog-backend) npm run db:seed
```

---

## 🔍 Troubleshooting

### Problemas Comuns

**1. Serviço não inicia**
```bash
# Verificar logs
docker service logs faceblog_faceblog-backend

# Verificar configuração
docker service inspect faceblog_faceblog-backend
```

**2. Health check falha**
```bash
# Testar internamente
docker exec -it CONTAINER_ID curl http://localhost:5000/health

# Verificar Traefik
curl -H "Host: api.fbrlive.xyz" http://localhost/health
```

**3. Problemas de conectividade**
```bash
# Verificar rede
docker network ls | grep FBRnet
docker network inspect FBRnet

# Testar conectividade entre serviços
docker exec -it BACKEND_CONTAINER ping postgres
```

**4. Certificado SSL**
```bash
# Verificar Traefik logs
docker service logs traefik_traefik

# Forçar renovação Let's Encrypt
docker exec -it TRAEFIK_CONTAINER traefik --help
```

---

## 🔄 Atualizações e Rollbacks

### Atualizar Serviço

```bash
# Atualizar com nova imagem
docker service update --image registry.fbrlive.xyz/faceblog-backend:2025-08-28 \
  --update-order start-first \
  faceblog_faceblog-backend

# Verificar rollout
docker service ps faceblog_faceblog-backend
```

### Rollback

```bash
# Rollback automático
docker service rollback faceblog_faceblog-backend

# Rollback para versão específica
docker service update --image registry.fbrlive.xyz/faceblog-backend:2025-08-27 \
  faceblog_faceblog-backend
```

---

## 📊 Monitoramento

### Health Checks

- **Frontend**: https://blog.fbrlive.xyz/health
- **Backend**: https://api.fbrlive.xyz/health
- **Backend Detalhado**: https://api.fbrlive.xyz/api/health

### Logs

```bash
# Logs em tempo real
docker service logs -f --tail 100 faceblog_faceblog-backend
docker service logs -f --tail 100 faceblog_faceblog-frontend

# Logs com timestamps
docker service logs -t faceblog_faceblog-backend
```

### Métricas

```bash
# Uso de recursos
docker stats $(docker ps -q -f name=faceblog)

# Status dos serviços
docker service ls
docker stack ps faceblog
```

---

## ✅ Checklist Final

Após o deploy, verificar:

- [ ] ✅ Frontend acessível: https://blog.fbrlive.xyz
- [ ] ✅ Backend API: https://api.fbrlive.xyz/health
- [ ] ✅ SSL certificados válidos
- [ ] ✅ Banco de dados conectado
- [ ] ✅ Redis funcionando
- [ ] ✅ Logs sem erros críticos
- [ ] ✅ Health checks passando
- [ ] ✅ Funcionalidades principais testadas

---

**🎉 Deploy Concluído com Sucesso!**

Para suporte, verifique os logs e consulte a seção de troubleshooting.
