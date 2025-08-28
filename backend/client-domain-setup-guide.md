# 🌐 Guia de Configuração de Domínios Personalizados para Clientes

## Cenário: lifewayusa.app/blog → lifewayusa.faceblog.top

### 📋 **Opção 1: Subdomínio CNAME (Mais Simples)**

**Configuração DNS no cliente:**
```dns
# No painel DNS de lifewayusa.app
blog.lifewayusa.app    CNAME    lifewayusa.faceblog.top
```

**Resultado:**
- Cliente acessa: `https://blog.lifewayusa.app`
- Resolve para: `lifewayusa.faceblog.top`
- **Vantagem**: Simples, sem configuração adicional
- **Desvantagem**: URL muda para blog.lifewayusa.app

---

### 📋 **Opção 2: Proxy Reverso (URL Mantém /blog)**

**No servidor do cliente (lifewayusa.app), adicionar ao Nginx:**

```nginx
# Manter site principal
location / {
    # Configuração existente do cliente
}

# Proxy para blog FaceBlog
location /blog {
    rewrite ^/blog/?(.*) /$1 break;
    proxy_pass https://lifewayusa.faceblog.top;
    proxy_set_header Host lifewayusa.faceblog.top;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Corrigir links internos
    sub_filter 'href="/' 'href="/blog/';
    sub_filter 'src="/' 'src="/blog/';
    sub_filter_once off;
}

# API do blog
location /blog/api/ {
    rewrite ^/blog/api/?(.*) /api/$1 break;
    proxy_pass https://api.faceblog.top;
    proxy_set_header Host api.faceblog.top;
}
```

**Resultado:**
- Cliente acessa: `https://lifewayusa.app/blog`
- Conteúdo vem de: `lifewayusa.faceblog.top`
- **Vantagem**: URL mantém /blog
- **Desvantagem**: Requer configuração no servidor do cliente

---

### 📋 **Opção 3: Domínio Completo Personalizado**

**Configuração DNS no cliente:**
```dns
# No painel DNS de lifewayusa.app
blog.lifewayusa.app    A    65.181.118.38
```

**No FaceBlog, configurar tenant:**
```sql
UPDATE tenants 
SET custom_domain = 'blog.lifewayusa.app' 
WHERE slug = 'lifewayusa';
```

**Resultado:**
- Cliente acessa: `https://blog.lifewayusa.app`
- Servidor FaceBlog resolve tenant por custom_domain
- **Vantagem**: Domínio totalmente personalizado
- **Desvantagem**: Requer configuração no FaceBlog

---

## 🚀 **Implementação Recomendada**

### **Para a maioria dos clientes: Opção 1 (CNAME)**

1. **Cliente configura DNS:**
   ```dns
   blog.lifewayusa.app    CNAME    lifewayusa.faceblog.top
   ```

2. **Você configura tenant no FaceBlog:**
   ```sql
   INSERT INTO tenants (name, slug, subdomain, custom_domain, status, plan)
   VALUES ('LifeWay USA', 'lifewayusa', 'lifewayusa', 'blog.lifewayusa.app', 'active', 'pro');
   ```

3. **SSL automático via Cloudflare**

### **Para clientes avançados: Opção 2 (Proxy)**

- Cliente implementa proxy reverso no próprio servidor
- Mantém URL `lifewayusa.app/blog`
- Requer conhecimento técnico do cliente

---

## 📊 **Comparação das Opções**

| Aspecto | CNAME | Proxy Reverso | Domínio Completo |
|---------|-------|---------------|------------------|
| **Simplicidade** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **URL Final** | blog.lifewayusa.app | lifewayusa.app/blog | blog.lifewayusa.app |
| **Configuração Cliente** | DNS apenas | Nginx completo | DNS apenas |
| **Configuração FaceBlog** | Mínima | Nenhuma | Tenant custom_domain |
| **SSL** | Automático | Cliente gerencia | Automático |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 **Processo para Novos Clientes**

1. **Criar tenant no FaceBlog:**
   ```bash
   # SSH na VPS
   psql -U faceblog_user -d faceblog_db
   ```

2. **Inserir tenant:**
   ```sql
   INSERT INTO tenants (name, slug, subdomain, custom_domain, status, plan)
   VALUES ('Nome Cliente', 'slug-cliente', 'slug-cliente', 'blog.dominio-cliente.com', 'active', 'pro');
   ```

3. **Instruir cliente:**
   - Configurar DNS: `blog.dominio-cliente.com CNAME slug-cliente.faceblog.top`
   - Aguardar propagação DNS (até 24h)
   - Testar acesso

4. **Verificar funcionamento:**
   ```bash
   curl -H "Host: blog.dominio-cliente.com" http://65.181.118.38/api/health
   ```

**Essa abordagem permite escalar facilmente para centenas de clientes!**
