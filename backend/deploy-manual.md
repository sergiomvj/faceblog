# Deploy Manual FaceBlog - Passo a Passo

## Método 1: PowerShell Simples

Execute no PowerShell (como administrador):

```powershell
cd "c:\Users\Sergio Castro\Documents\Projetos\FaceBlog\backend"
.\deploy-simple.ps1
```

## Método 2: Comandos Individuais

Execute um por vez no PowerShell:

```powershell
# 1. Ir para o diretório
cd "c:\Users\Sergio Castro\Documents\Projetos\FaceBlog\backend"

# 2. Copiar arquivo principal
scp src/simple-server.js root@65.181.118.38:/opt/faceblog/src/

# 3. Reiniciar serviço
ssh root@65.181.118.38 "pm2 restart faceblog"

# 4. Verificar status
ssh root@65.181.118.38 "pm2 list"

# 5. Testar API
ssh root@65.181.118.38 "curl http://localhost:5000/health"
```

## Método 3: Via WinSCP (Interface Gráfica)

1. Abra o WinSCP
2. Conecte em: 65.181.118.38 (usuário: root)
3. Navegue até: `/opt/faceblog/src/`
4. Copie o arquivo: `simple-server.js`
5. No terminal SSH: `pm2 restart faceblog`

## Verificação Final

Acesse: https://faceblog.top/api/health

Deve retornar: `{"success": true, "message": "API is running"}`

## Troubleshooting

Se der erro:
- Verifique se o SSH está funcionando: `ssh root@65.181.118.38`
- Verifique se o PM2 está rodando: `ssh root@65.181.118.38 "pm2 status"`
- Verifique logs: `ssh root@65.181.118.38 "pm2 logs faceblog"`
