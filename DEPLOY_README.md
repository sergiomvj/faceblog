# FaceBlog Deployment Guide - Portainer + Traefik

## Overview

FaceBlog deployment for **Portainer + Traefik + Docker Swarm** environment following the deployment contract specifications.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Traefik       │    │   Frontend      │    │   Backend       │
│   (FBRnet)      │────│   (Port 3000)   │────│   (Port 5000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   Redis         │
                       │   (Port 5432)   │    │   (Port 6379)   │
                       └─────────────────┘    └─────────────────┘
```

## Domain Mapping

| Domain | Service | Internal Port | Description |
|--------|---------|---------------|-------------|
| `blog.fbrlive.xyz` | Frontend | 3000 | React SPA |
| `api.fbrlive.xyz` | Backend | 5000 | REST API |

## Health Check URLs

- **Frontend**: `http://localhost:3000/health`
- **Backend**: `http://localhost:5000/health`

## Prerequisites

1. **Docker & Docker Compose** installed
2. **Traefik** running with `traefik-public` network
3. **Domain names** configured (DNS pointing to your server)
4. **SSL certificates** (handled by Traefik + Let's Encrypt)

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd FaceBlog
```

### 2. Environment Configuration

```bash
# Copy and edit environment file
cp .env.example .env

# Edit domains and credentials
nano .env
```

**Required changes in `.env`:**
- Replace `yourdomain.com` with your actual domain
- Set secure passwords for `DB_PASSWORD` and `REDIS_PASSWORD`
- Generate a strong `JWT_SECRET` (minimum 32 characters)

### 3. Create Docker Secrets

```bash
# Create secrets directory
mkdir -p secrets

# Create secret files
echo "your_secure_database_password" > secrets/db_password.txt
echo "your_super_secure_jwt_secret_key_minimum_32_characters" > secrets/jwt_secret.txt

# Secure the secrets
chmod 600 secrets/*.txt
```

### 4. Deploy

```bash
# Create Traefik network (if not exists)
docker network create traefik-public

# Deploy the stack
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## Database Migrations

### Initial Setup

```bash
# Run database migrations
docker-compose exec backend npm run migrate:up

# Optional: Seed with sample data
docker-compose exec backend npm run db:seed
```

### Production Migrations

```bash
# Check migration status
docker-compose exec backend npm run migrate:status

# Run pending migrations
docker-compose exec backend npm run migrate:up

# Rollback if needed
docker-compose exec backend npm run migrate:down
```

## Health Checks

The application includes comprehensive health checks:

### Endpoints

- **Frontend**: `GET /health` → Returns `healthy`
- **Backend**: `GET /health` → Returns `OK`
- **Backend Detailed**: `GET /api/health` → Returns JSON with system status

### Monitoring

```bash
# Check all services health
docker-compose ps

# View health check logs
docker-compose logs backend | grep health
docker-compose logs frontend | grep health

# Manual health check
curl https://api.yourdomain.com/health
curl https://blog.yourdomain.com/health
```

## Resource Limits

| Service | Memory Limit | CPU Limit | Memory Reserved | CPU Reserved |
|---------|--------------|-----------|-----------------|--------------|
| Backend | 1GB | 1.0 | 512MB | 0.5 |
| Frontend | 512MB | 0.5 | 256MB | 0.25 |
| PostgreSQL | 512MB | 0.5 | 256MB | 0.25 |
| Redis | 256MB | 0.25 | 128MB | 0.1 |

## Backup & Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U faceblog faceblog > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U faceblog faceblog < backup_file.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v faceblog_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v faceblog_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

## Troubleshooting

### Common Issues

1. **503 Service Unavailable**
   ```bash
   # Check if services are healthy
   docker-compose ps
   
   # Check Traefik labels
   docker-compose config
   
   # Verify network connectivity
   docker network ls | grep traefik
   ```

2. **Database Connection Errors**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Test database connection
   docker-compose exec backend npm run migrate:status
   ```

3. **CORS Errors**
   ```bash
   # Verify CORS_ORIGIN in .env matches frontend domain
   grep CORS_ORIGIN .env
   ```

### Logs

```bash
# View all logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis

# Follow logs with timestamps
docker-compose logs -f -t backend
```

### Performance Monitoring

```bash
# Resource usage
docker stats

# Service-specific stats
docker stats faceblog_backend faceblog_frontend

# Disk usage
docker system df
docker volume ls
```

## Security Considerations

1. **Secrets Management**: Use Docker secrets for sensitive data
2. **Network Isolation**: Services communicate via internal network
3. **SSL/TLS**: Enforced via Traefik with Let's Encrypt
4. **Security Headers**: Implemented in both frontend and backend
5. **Rate Limiting**: Configured in backend middleware
6. **Input Sanitization**: XSS protection enabled

## Scaling

### Horizontal Scaling

```yaml
# In docker-compose.yml, add:
deploy:
  replicas: 3
  update_config:
    parallelism: 1
    delay: 10s
  restart_policy:
    condition: on-failure
```

### Load Balancing

Traefik automatically load balances between multiple container instances.

## Updates & Maintenance

### Application Updates

```bash
# Pull latest images
docker-compose pull

# Recreate containers
docker-compose up -d --force-recreate

# Remove old images
docker image prune -f
```

### System Maintenance

```bash
# Clean up unused resources
docker system prune -f

# Update Docker images
docker-compose pull
docker-compose up -d

# Restart services
docker-compose restart
```

## Environment Variables Reference

See `.env.example` for complete configuration options including:

- **Database**: Connection settings, SSL, connection pooling
- **Redis**: Cache configuration and authentication
- **JWT**: Token settings and expiration
- **CORS**: Cross-origin request configuration
- **Email**: SMTP settings for notifications
- **File Upload**: Size limits and allowed types
- **AWS S3**: Optional cloud storage configuration
- **Security**: Rate limiting and encryption settings
- **Monitoring**: Logging and error tracking

## Support

For issues and questions:

1. Check the logs: `docker-compose logs -f`
2. Verify health checks: `curl https://api.yourdomain.com/health`
3. Review configuration: `docker-compose config`
4. Check resource usage: `docker stats`

---

**Last Updated**: August 2025  
**Version**: 2.0.0
