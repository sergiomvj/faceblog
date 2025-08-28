# FaceBlog Deploy Simples - PowerShell
# Execute este arquivo diretamente no PowerShell

$VPS_IP = "65.181.118.38"
$VPS_USER = "root"

Write-Host "🚀 FaceBlog Deploy Simples - $(Get-Date)" -ForegroundColor Green
Write-Host "=========================================="

# 1. Copiar arquivo principal do backend
Write-Host "[INFO] Copiando simple-server.js..." -ForegroundColor Yellow
scp "src/simple-server.js" "${VPS_USER}@${VPS_IP}:/opt/faceblog/src/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] ✅ Backend copiado" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ❌ Falha ao copiar backend" -ForegroundColor Red
    exit 1
}

# 2. Reiniciar o serviço
Write-Host "[INFO] Reiniciando serviço..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "pm2 restart faceblog"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] ✅ Serviço reiniciado" -ForegroundColor Green
} else {
    Write-Host "[WARNING] ⚠️ Problema ao reiniciar serviço" -ForegroundColor Yellow
}

# 3. Verificar status
Write-Host "[INFO] Verificando status..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "pm2 list | grep faceblog"

# 4. Testar API
Write-Host "[INFO] Testando API..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "curl -s http://localhost:5000/health"

Write-Host ""
Write-Host "🎉 Deploy concluído!" -ForegroundColor Green
Write-Host "URL: https://faceblog.top" -ForegroundColor Cyan
Write-Host "API: https://faceblog.top/api/health" -ForegroundColor Cyan
