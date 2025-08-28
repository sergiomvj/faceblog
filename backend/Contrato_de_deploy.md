Perfeito 🚀 — aqui está o **Contrato de Deploy** formatado em Markdown para você entregar ao time de desenvolvimento. Assim eles terão um padrão único para criar `docker-compose.yml` e `Dockerfile` compatíveis com seu ambiente (Portainer + Traefik + Swarm).

---

````markdown
# 📜 Contrato de Deploy — Padrão Portainer + Traefik (Swarm)

Este documento define os **requisitos obrigatórios** para que qualquer aplicação seja entregue pronta para deploy em nosso ambiente de produção.

---

## ✅ Estrutura de Arquivos Obrigatória

O repositório de cada app deve conter:

- `Dockerfile` (multi-stage build, quando aplicável)
- `docker-compose.yml` (seguindo os padrões abaixo)
- `.env.example` (todas as variáveis obrigatórias, sem valores sensíveis)
- `README.md` com:
  - Porta interna usada pelo app
  - URL do healthcheck
  - Variáveis de ambiente necessárias
  - Comandos de migração/seed (se houver banco de dados)

---

## 🐳 Regras para `docker-compose.yml`

### Versão
```yaml
version: "3.8"
````

### Serviço de Aplicação

Cada serviço deve conter:

* **Imagem**

  ```yaml
  image: registry.exemplo.com/<app>:<tag>
  ```

  * Não usar apenas `latest` em produção.
  * Tags devem ser **imutáveis** (`1.0.0`, `2025-08-27`, etc.).

* **Variáveis de Ambiente**

  ```yaml
  env_file:
    - .env
  ```

* **Porta Interna**

  * Usar apenas `server.port` nas labels do Traefik.
  * Não expor portas diretamente (`ports:` proibido).

* **Rede**

  ```yaml
  networks:
    - FBRnet
  ```

  > **Todos os serviços expostos devem estar na rede externa `FBRnet`.**

* **Healthcheck**

  ```yaml
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 20s
  ```

* **Escalabilidade**

  ```yaml
  deploy:
    replicas: 2
    update_config:
      order: start-first
      parallelism: 1
      delay: 10s
    restart_policy:
      condition: on-failure
  ```

---

## 🌐 Labels do Traefik (Obrigatórias)

```yaml
deploy:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.<app>-secure.rule=Host(`<domínio>`)"
    - "traefik.http.routers.<app>-secure.entrypoints=websecure"
    - "traefik.http.routers.<app>-secure.tls=true"
    - "traefik.http.routers.<app>-secure.tls.certresolver=letsencryptresolver"
    - "traefik.http.services.<app>.loadbalancer.server.port=<porta-interna>"
```

🔑 Substituições:

* `<app>` → identificador único do serviço
* `<domínio>` → domínio real (ex.: `api.fbrlive.xyz`)
* `<porta-interna>` → porta usada pelo container (ex.: 3000, 8000)

---

## 📦 Volumes

* Apenas quando necessário (uploads, cache, persistência).
* Sempre usar **volumes nomeados** (não caminhos absolutos).
* Documentar cada volume no `README.md`.

---

## 🛡️ Segurança

* Apenas serviços web devem ter `traefik.enable=true`.
* Serviços internos (DB, Redis, workers) → `traefik.enable=false`.
* Senhas e chaves **nunca hardcoded** → sempre via `.env`.

---

## 📋 Exemplo de Compose Completo

```yaml
version: "3.8"

services:
  myapp:
    image: registry.exemplo.com/myapp:1.0.0
    env_file:
      - .env
    networks:
      - FBRnet
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.myapp-secure.rule=Host(`app.fbrlive.xyz`)"
        - "traefik.http.routers.myapp-secure.entrypoints=websecure"
        - "traefik.http.routers.myapp-secure.tls=true"
        - "traefik.http.routers.myapp-secure.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.myapp.loadbalancer.server.port=3000"
      update_config:
        order: start-first
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

networks:
  FBRnet:
    external: true
```

---

## 🚀 Resumo

* Cada app **deve falar HTTPS direto via Traefik** (sem expor portas).
* Deve estar sempre na rede externa `FBRnet`.
* Deve ter healthcheck.
* Deve ter `.env.example`.
* Deve estar documentado no `README.md`.

---

```

---


```
