# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copia apenas os arquivos necessários para instalar as dependências
COPY frontend/package*.json ./
RUN npm ci

# Copia o resto do código e faz o build
COPY frontend/ .
RUN npm run build

# Production stage
FROM nginx:alpine

# Configuração do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração de segurança
RUN echo '
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Roteamento do React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
' > /etc/nginx/conf.d/default.conf

# Expõe a porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
