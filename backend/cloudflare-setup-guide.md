# ☁️ Guia Completo: Configuração CloudFlare para FaceBlog.top

## 🌐 **Passo 1: Configuração DNS no CloudFlare**

### **Registros DNS Necessários:**

```dns
# Domínio principal
Tipo: A
Nome: faceblog.top (ou @)
Conteúdo: 65.181.118.38
Proxy: ☁️ Proxied (Laranja)
TTL: Auto

# Wildcard para subdomínios
Tipo: A  
Nome: *.faceblog.top (ou *)
Conteúdo: 65.181.118.38
Proxy: ☁️ Proxied (Laranja)
TTL: Auto

# API específico
Tipo: A
Nome: api.faceblog.top
Conteúdo: 65.181.118.38
Proxy: ☁️ Proxied (Laranja)
TTL: Auto

# Admin específico
Tipo: A
Nome: admin.faceblog.top
Conteúdo: 65.181.118.38
Proxy: ☁️ Proxied (Laranja)
TTL: Auto

# WWW redirect
Tipo: A
Nome: www.faceblog.top
Conteúdo: 65.181.118.38
Proxy: ☁️ Proxied (Laranja)
TTL: Auto
```

---

## 🔧 **Passo 2: Configurações SSL/TLS**

### **No painel CloudFlare:**

1. **SSL/TLS → Overview:**
   - Encryption mode: **Full (strict)**
   
2. **SSL/TLS → Edge Certificates:**
   - ✅ Always Use HTTPS: **ON**
   - ✅ HTTP Strict Transport Security (HSTS): **Enable**
   - ✅ Minimum TLS Version: **1.2**
   - ✅ Opportunistic Encryption: **ON**
   - ✅ TLS 1.3: **ON**

3. **SSL/TLS → Origin Server:**
   - Create Certificate (se necessário para VPS)

---

## ⚡ **Passo 3: Performance & Caching**

### **Speed → Optimization:**
- ✅ Auto Minify: **JavaScript, CSS, HTML**
- ✅ Brotli: **ON**
- ✅ Early Hints: **ON**

### **Caching → Configuration:**
- Caching Level: **Standard**
- Browser Cache TTL: **4 hours**
- Always Online: **ON**

### **Page Rules (opcional):**
```
# Cache API responses por 5 minutos
api.faceblog.top/api/*
- Cache Level: Cache Everything
- Edge Cache TTL: 5 minutes

# Cache estático por 1 dia
*.faceblog.top/*.css
*.faceblog.top/*.js
*.faceblog.top/*.png
*.faceblog.top/*.jpg
- Cache Level: Cache Everything
- Edge Cache TTL: 1 day
```

---

## 🛡️ **Passo 4: Segurança**

### **Security → Settings:**
- Security Level: **Medium**
- Challenge Passage: **30 minutes**
- Browser Integrity Check: **ON**

### **Firewall → Settings:**
- ✅ Bot Fight Mode: **ON**
- ✅ Challenge for known bots: **ON**

### **Security → WAF:**
- Web Application Firewall: **ON**
- OWASP Core Ruleset: **ON**

---

## 🌍 **Passo 5: Network Settings**

### **Network:**
- HTTP/2: **ON**
- HTTP/3 (with QUIC): **ON**
- 0-RTT Connection Resumption: **ON**
- IPv6 Compatibility: **ON**
- WebSockets: **ON**
- Onion Routing: **ON**

---

## 📊 **Passo 6: Analytics & Logs**

### **Analytics → Web Analytics:**
- ✅ Enable Web Analytics

### **Logs → Logpush (opcional):**
- Configure para monitoramento avançado

---

## 🎯 **Passo 7: Configurações Específicas FaceBlog**

### **Transform Rules (opcional):**

**Para corrigir headers multi-tenant:**
```
# Rule 1: Add tenant headers
If: hostname matches "*.faceblog.top"
Then: 
- Set request header "X-Tenant-Source" to "subdomain"
- Set request header "X-Original-Host" to hostname
```

### **Redirect Rules:**

**Redirect www para admin:**
```
# Rule 1: WWW redirect
If: hostname equals "www.faceblog.top"
Then: Dynamic redirect
- Type: 301
- Expression: concat("https://admin.faceblog.top", http.request.uri.path)
```

**Redirect root para admin:**
```
# Rule 2: Root redirect  
If: hostname equals "faceblog.top" AND http.request.uri.path equals "/"
Then: Dynamic redirect
- Type: 301
- Expression: "https://admin.faceblog.top"
```

---

## 🚀 **Passo 8: Aplicar Configuração na VPS**

### **Após DNS ativo, atualizar Nginx:**

```bash
# SSH na VPS
ssh root@65.181.118.38

# Copiar nova configuração
cp /opt/faceblog/nginx-faceblog-top.conf /etc/nginx/sites-available/faceblog

# Testar configuração
nginx -t

# Se OK, recarregar
systemctl reload nginx

# Verificar status
systemctl status nginx
pm2 status
```

---

## ✅ **Passo 9: Testes de Verificação**

### **Testar endpoints:**

```bash
# Health check
curl https://faceblog.top/api/health
curl https://api.faceblog.top/api/health

# Admin panel
curl -I https://admin.faceblog.top

# Subdomain test
curl -I https://demo.faceblog.top

# SSL test
curl -I https://faceblog.top
```

### **Verificar SSL:**
- https://www.ssllabs.com/ssltest/analyze.html?d=faceblog.top
- Deve mostrar **A+** rating

### **Verificar DNS propagação:**
- https://dnschecker.org/#A/faceblog.top
- Verificar se todos os servidores mostram 65.181.118.38

---

## 🎯 **Resumo da Configuração**

### **CloudFlare Dashboard:**
1. **DNS**: 5 registros A apontando para 65.181.118.38
2. **SSL**: Full (strict) + HSTS + Always HTTPS
3. **Performance**: Minify + Brotli + Cache otimizado
4. **Security**: WAF + Bot protection + Medium security
5. **Network**: HTTP/2 + HTTP/3 + WebSockets

### **Resultado Final:**
- ✅ **faceblog.top** → Admin panel
- ✅ **admin.faceblog.top** → Admin interface
- ✅ **api.faceblog.top** → API backend
- ✅ **demo.faceblog.top** → Cliente demo
- ✅ **cliente.faceblog.top** → Qualquer cliente
- ✅ **SSL automático** para todos os domínios
- ✅ **CDN global** com cache otimizado
- ✅ **DDoS protection** integrada

**Tempo de propagação: 5-30 minutos após configuração DNS**
