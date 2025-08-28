# Blog-as-a-Service Backend

Multi-tenant Node.js/TypeScript/Express API for the Blog-as-a-Service platform.

## 🚀 Features Implemented

### ✅ Core Infrastructure
- **Multi-tenant Architecture**: Schema isolation per tenant
- **Authentication**: JWT-based auth with role/permission system
- **Database**: PostgreSQL with Knex.js ORM
- **Caching**: Redis integration for performance
- **Logging**: Winston-based structured logging
- **Error Handling**: Centralized error management

### ✅ API Endpoints
- **Auth Routes**: Login, registration, profile management
- **Articles**: CRUD with pagination, filtering, tags
- **Tenants**: Multi-tenant management and analytics
- **BigWriter Integration**: AI-powered content generation

### ✅ BigWriter AI Integration
- Content generation with customizable parameters
- Job status tracking and management
- Content import to articles
- Webhook support for async processing
- Statistics and cleanup utilities

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Knex.js
- **Cache**: Redis
- **Auth**: JWT + bcrypt
- **Validation**: Joi + express-validator
- **Logging**: Winston
- **Testing**: Jest (planned)

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Setup

1. **Install dependencies**:
```bash
cd backend
npm install
```

2. **Environment configuration**:
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

3. **Database setup**:
```bash
# Run migrations (creates tables and demo data)
npm run migrate:up

# Check migration status
npm run migrate:status
```

4. **Start development server**:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 🗄️ Database Schema

### Multi-tenant Architecture
- **Public Schema**: `tenants`, `api_keys`, `migrations`
- **Tenant Schemas**: `tenant_<slug>` (e.g., `tenant_demo`)

### Tenant Tables
- `users` - User accounts and roles
- `articles` - Blog posts and content
- `categories` - Content categorization
- `tags` - Article tagging system
- `comments` - User comments
- `media` - File uploads
- `bigwriter_jobs` - AI content generation jobs
- `webhooks` - External integrations
- `integrations` - Third-party services

## 🔧 Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run migrate:up      # Run all migrations
npm run migrate:down    # Rollback last migration
npm run migrate:reset   # Reset entire database
npm run migrate:status  # Show migration status

# Testing
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode

# Code Quality
npm run lint           # Check code style
npm run lint:fix       # Fix code style issues
```

## 🔐 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blogservice
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# BigWriter API
BIGWRITER_API_KEY=your-bigwriter-api-key
BIGWRITER_API_URL=https://api.bigwriter.com
BIGWRITER_WEBHOOK_SECRET=your-webhook-secret

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/          # Database, Redis, etc.
│   ├── middleware/      # Auth, tenant, error handling
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic (BigWriter, etc.)
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utilities (logger, etc.)
│   ├── migrations/      # SQL migration files
│   └── scripts/         # CLI tools (migrate, start)
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Articles
- `GET /api/articles` - List articles (with filters)
- `POST /api/articles` - Create article
- `GET /api/articles/:id` - Get article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article
- `POST /api/articles/:id/tags` - Add tags to article

### Tenants
- `GET /api/tenants` - List tenants (admin only)
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### BigWriter AI
- `POST /api/bigwriter/generate` - Generate content
- `GET /api/bigwriter/status/:jobId` - Check job status
- `POST /api/bigwriter/import/:jobId` - Import to article
- `GET /api/bigwriter/jobs` - List user jobs
- `DELETE /api/bigwriter/jobs/:jobId` - Delete job
- `POST /api/bigwriter/webhook` - Webhook endpoint

## 🔒 Authentication & Authorization

### JWT Authentication
- Access tokens (7 days default)
- Refresh tokens (30 days default)
- Token blacklisting support

### Role-based Access Control
- **Admin**: Full system access
- **Editor**: Content management
- **Author**: Own content only
- **Subscriber**: Read-only access

### Permission System
Fine-grained permissions like:
- `articles.create`, `articles.read`, `articles.update`, `articles.delete`
- `tenants.manage`, `users.manage`
- `bigwriter.generate`, `bigwriter.import`

## 🤖 BigWriter Integration

### Content Generation Flow
1. **Request**: Submit topic, keywords, tone, length
2. **Processing**: AI generates content asynchronously
3. **Status**: Track job progress via API
4. **Import**: Convert generated content to article
5. **Cleanup**: Automatic old job removal

### Features
- Multiple content tones (professional, casual, technical, friendly)
- Configurable length (short, medium, long)
- SEO optimization with meta descriptions
- Tag suggestions
- Multi-language support

## 🚧 Development Status

### ✅ Completed
- Multi-tenant database schema
- Authentication and authorization
- Core API routes (auth, articles, tenants)
- BigWriter AI integration
- Database migrations and seeding
- Development scripts and tooling

### 🔄 In Progress
- Error handling improvements
- Input validation enhancements
- API documentation (OpenAPI/Swagger)

### 📋 Planned
- Unit and integration tests
- Social media integrations
- Newsletter integrations
- Advanced analytics
- File upload system
- SEO automation tools
- Performance monitoring
- CI/CD pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the Blog-as-a-Service platform.
