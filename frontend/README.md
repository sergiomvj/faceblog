# 📝 Blog-as-a-Service (BaaS) - Frontend Admin

Frontend administrativo para o serviço centralizado de blog multi-tenant, desenvolvido com React + TypeScript + Tailwind CSS.

## 🚀 Tecnologias

- **React 18** com TypeScript
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Lucide React** para ícones
- **Axios** para requisições HTTP

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   └── Layout/
│       ├── Header.tsx      # Cabeçalho com busca e notificações
│       ├── Sidebar.tsx     # Menu lateral de navegação
│       └── Layout.tsx      # Layout principal da aplicação
├── pages/
│   ├── Dashboard.tsx       # Dashboard com métricas e estatísticas
│   └── Articles.tsx        # Gestão de artigos
├── types/
│   └── index.ts           # Definições de tipos TypeScript
└── App.tsx                # Configuração de rotas principais
```

## 🎯 Funcionalidades Implementadas

### ✅ Layout e Navegação
- **Sidebar responsiva** com menu de navegação
- **Header** com busca global e notificações
- **Layout adaptativo** para desktop e mobile

### ✅ Dashboard
- **Métricas em tempo real**: artigos, usuários, comentários, visualizações
- **Estatísticas de tenants** e taxa de crescimento
- **Lista de artigos recentes** com status e visualizações

### ✅ Gestão de Artigos
- **Listagem completa** com filtros por status
- **Busca em tempo real** por título e autor
- **Ações rápidas**: visualizar, editar, excluir
- **Status badges**: publicado, rascunho, agendado

## 🚀 Como Executar

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm start
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000)

### Outros Comandos

```bash
# Executar testes
npm test

# Build para produção
npm run build

# Análise do bundle
npm run build && npx serve -s build
```

## 🎨 Design System

### Cores Principais
- **Primary**: Azul (#3b82f6) para elementos principais
- **Secondary**: Cinza (#64748b) para elementos secundários
- **Success**: Verde para status positivos
- **Warning**: Amarelo para alertas
- **Error**: Vermelho para erros

### Componentes Base
- Cards com shadow e bordas arredondadas
- Botões com estados hover e focus
- Formulários com validação visual
- Tabelas responsivas com ações

## 🔗 Integração com Backend

O frontend está preparado para integração com a API do Blog Service:

```typescript
// Exemplo de configuração da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Endpoints principais
GET    /api/articles          # Listar artigos
POST   /api/articles          # Criar artigo
PUT    /api/articles/:id      # Atualizar artigo
DELETE /api/articles/:id      # Excluir artigo

GET    /api/tenants           # Listar tenants
GET    /api/analytics         # Métricas e estatísticas
```

## 📱 Responsividade

- **Mobile First**: Design otimizado para dispositivos móveis
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Menu lateral**: Colapsível em telas menores
- **Tabelas**: Scroll horizontal em dispositivos móveis

## 🔮 Próximos Passos

### Páginas a Implementar
- [ ] **Categorias**: CRUD completo com hierarquia
- [ ] **Tags**: Gestão de etiquetas com cores
- [ ] **Comentários**: Moderação e aprovação
- [ ] **Usuários**: Gestão de roles e permissões
- [ ] **Tenants**: Onboarding e configurações
- [ ] **Analytics**: Gráficos e relatórios detalhados
- [ ] **Configurações**: Personalização e integrações

### Funcionalidades Avançadas
- [ ] **Editor WYSIWYG** para artigos
- [ ] **Upload de mídia** com preview
- [ ] **Agendamento** de publicações
- [ ] **Integração BigWriter** para IA
- [ ] **Notificações** em tempo real
- [ ] **Temas customizáveis** por tenant

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
