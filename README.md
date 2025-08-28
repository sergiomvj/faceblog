# 🚀 FaceBlog - Multi-tenant Blog Platform

## Overview

FaceBlog is a modern multi-tenant blog platform built with React frontend and Node.js backend, designed for Portainer + Traefik + Docker Swarm deployment.

## Internal Ports

- **Frontend**: 3000 (React + Nginx)
- **Backend**: 5000 (Node.js/Express)
- **PostgreSQL**: 5432
- **Redis**: 6379

## Health Check URLs

- **Frontend**: `http://localhost:3000/health`
- **Backend**: `http://localhost:5000/health`
- **Backend Detailed**: `http://localhost:5000/api/health`

## Environment Variables

See `.env.example` for all required environment variables including:

- Database configuration (PostgreSQL)
- Redis cache settings
- JWT authentication secrets
- Domain configuration
- Optional email/S3 settings

## Database Migrations

```bash
# Run migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Rollback migrations
npm run migrate:down
```

## Seed Data

```bash
# Load initial data
npm run db:seed
```

## ✨ **Key Features**

- 🏢 **Multi-Tenant Architecture** - Complete tenant isolation with custom domains
- 🤖 **Automated Client Setup** - CLI, API, and web dashboard for client management  
- 🌍 **Custom Domains** - Support for client-specific domains (e.g., blog.client.com)
- 🔐 **Native Authentication** - JWT-based auth with bcrypt password hashing
- ⚡ **Production Infrastructure** - VPS deployment with PostgreSQL, Nginx, PM2
- ☁️ **CloudFlare Integration** - CDN, SSL, DDoS protection, and DNS management
- 📊 **Client Automation** - Batch client creation, API management, statistics

## 🏗️ **Arquitetura**

```
┌─────────────────────────────────────┐
│        BLOG SERVICE (Central)       │
├─────────────────────────────────────┤
│  • API Gateway + Auth              │
│  • Tenant Management               │
│  • Schema Isolation                │
│  • Update Distribution             │
│  • Analytics Dashboard             │
└─────────────────────────────────────┘
           │
           ├── 🏢 App Lifeway (tenant_lifeway)
           ├── 🏢 App Parceiro A (tenant_parceiroa)  
           ├── 🏢 App Parceiro B (tenant_parceirob)
           └── 🤖 BigWriter Integration
```

## 🚀 **Stack Tecnológica**

### Frontend (Implementado)
- **React 18** + **TypeScript**
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Lucide React** para ícones
- **Axios** para requisições HTTP

### Backend (Production-Ready)
- **Node.js** + **Express** + **PostgreSQL** (native)
- **JWT Authentication** + **bcrypt** password hashing
- **PM2** process management + **Nginx** reverse proxy
- **CloudFlare** CDN + SSL + DDoS protection
- **VPS Deployment** (65.181.118.38) with automated setup

## 📁 **Estrutura do Projeto**

```
FaceBlog/
├── BLOG_SERVICE_PROPOSAL.md    # 📋 Documento de proposta original
├── README.md                   # 📖 Este arquivo
├── package.json               # 📦 Scripts do projeto
└── frontend/                  # 🎨 Frontend React
    ├── src/
    │   ├── components/
    │   │   └── Layout/        # Layout responsivo
    │   ├── pages/             # Páginas principais
    │   │   ├── Dashboard.tsx  # Dashboard com métricas
    │   │   ├── Articles.tsx   # Gestão de artigos
    │   │   ├── Categories.tsx # Gestão de categorias
    │   │   ├── Tags.tsx       # Gestão de tags
    │   │   └── Tenants.tsx    # Gestão de tenants
    │   ├── types/             # Tipos TypeScript
    │   └── config/            # Configurações da API
    ├── tailwind.config.js     # Configuração do Tailwind
    └── README.md              # Documentação do frontend
```

## 🚀 **Como Executar**

### Pré-requisitos
- Node.js 16+
- npm 8+
```bash
cd frontend
npm install
npm start
```
The frontend will be available at `http://localhost:3001`

### Backend (Node.js + Express + Supabase)
```bash
cd backend
npm install
node src/server.js
```
The backend will be available at `http://localhost:5000`

### Multi-Tenant Setup
```bash
cd backend
node src/scripts/apply-schema-direct.js
```

## 📋 Current Status

### ✅ COMPLETED FEATURES

#### Frontend Admin Panel
- **Complete React + TypeScript + Tailwind CSS interface**
- **Responsive design** for mobile/desktop
- **Modern UI components** with Lucide React icons
- **Custom branding**: FaceBlog logo, favicon, page titles
- **User dropdown menu** in header with profile/settings/logout

#### Content Management System
- **Articles CRUD**: Create, read, update, delete with rich editor
- **Categories Management**: Hierarchical categories with colors
- **Tags System**: Flexible tagging with color coding
- **Comments System**: Threaded comments with moderation
- **User Management**: Admin, author, editor roles
- **Tenant Management**: Multi-tenant configuration

#### Gamification System
- **Quizzes**: Interactive quizzes linked to articles
- **Leaderboards**: User ranking system with points
- **Rewards**: Achievement system with custom rewards
- **User Points**: Point accumulation and tracking

#### Social Integrations
- **Platform Support**: Facebook, Twitter, Instagram, LinkedIn, YouTube, TikTok
- **Auto-posting**: Social media content distribution
- **Integration Management**: Connect/disconnect social accounts

#### Authentication & Security
- **JWT-based authentication** with token management
- **Multi-tenant API Key system** with permissions
- **Rate limiting middleware** (simplified implementation)
- **CORS configuration** for cross-origin requests

#### Backend API
- **Express.js server** with comprehensive routing
- **Supabase integration** with PostgreSQL database
- **Multi-tenant middleware** with API Key authentication
- **RESTful API design** with consistent responses
- **Error handling** and logging

### 🚧 PARTIALLY IMPLEMENTED

#### Multi-Tenant System
- ✅ **Basic tenant isolation** with demo tenant
- ✅ **API Key authentication** (simplified)
- ⚠️ **Schema isolation** (using public schema temporarily)
- ❌ **Automated tenant onboarding**
- ❌ **API Key management CRUD**

#### Database Schema
- ✅ **Core tables** (tenants, users, articles, categories, tags, comments)
- ✅ **Gamification tables** (quizzes, leaderboards, rewards)
- ⚠️ **API Keys table** (structure exists but not fully implemented)
- ❌ **Multi-schema isolation**
- ❌ **Row-level security policies**
- 💰 **Redução de Custos**: -70% tempo de desenvolvimento
- 🔄 **Manutenção**: Updates centralizados
- 📈 **Escalabilidade**: Suporte a centenas de tenants
- 💡 **Inovação**: Foco em features, não em infraestrutura

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 **Autor**

**Sergio Castro** - Desenvolvedor Principal

---

**Status do Projeto**: 🟢 Frontend Completo | 🟡 Backend em Planejamento

Para mais detalhes sobre a proposta original, consulte o arquivo `BLOG_SERVICE_PROPOSAL.md`.
