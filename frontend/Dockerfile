# Usando Node.js 18
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Build da aplicação
RUN npm run build

# Porta que o app vai rodar
EXPOSE 3000

# Comando para iniciar o app
CMD ["npm", "start"]
