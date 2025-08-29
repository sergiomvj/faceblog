FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência do frontend
COPY frontend/package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código do frontend
COPY frontend/ .

# Build da aplicação
RUN npm run build

# Configura o servidor web
EXPOSE 3000

# Comando para iniciar o app
CMD ["npm", "start"]
