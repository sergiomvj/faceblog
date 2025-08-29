FROM node:18-alpine

# 1. Cria diretório de trabalho
WORKDIR /app

# 2. Copia os arquivos do frontend
COPY frontend/package*.json ./

# 3. Instala as dependências
RUN npm install

# 4. Copia o restante do código
COPY frontend/ ./

# 5. Faz o build
RUN npm run build

# 6. Instala o servidor estático
RUN npm install -g serve

# 7. Expõe a porta
EXPOSE 3000

# 8. Inicia o servidor
CMD ["serve", "-s", "dist", "-l", "3000"]
