FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copia APENAS os arquivos necessários
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Instala as dependências raiz e do frontend
RUN npm install
RUN cd frontend && npm install

# Copia o restante do código
COPY . .

# Build da aplicação
RUN cd frontend && npm run build

# Expõe a porta
EXPOSE 3000

# Comando para iniciar o app
CMD ["npm", "start"]
