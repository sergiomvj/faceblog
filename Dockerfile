FROM node:18-alpine

# 1. Cria diretório de trabalho
WORKDIR /app

# 2. Copia APENAS os arquivos de configuração
COPY package*.json ./

# 3. Instala as dependências
RUN npm install

# 4. Copia TODO o conteúdo do frontend
COPY frontend ./frontend

# 5. Muda para o diretório do frontend
WORKDIR /app/frontend

# 6. Instala as dependências do frontend
RUN npm install

# 7. Cria a pasta public se não existir
RUN mkdir -p public

# 8. Copia o index.html para a pasta public
COPY frontend/public/index.html ./public/

# 9. Faz o build
RUN npm run build

# 10. Expõe a porta
EXPOSE 3000

# 11. Comando para iniciar
CMD ["npm", "start"]
