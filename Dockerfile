FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# 1. Copia package.json e package-lock.json
COPY package*.json ./

# 2. Instala as dependências
RUN npm install

# 3. Copia TODO o código do frontend
COPY . .

# 4. Muda para o diretório do frontend
WORKDIR /app/frontend

# 5. Instala as dependências do frontend
RUN npm install

# 6. Faz o build
RUN npm run build

# 7. Expõe a porta
EXPOSE 3000

# 8. Comando para iniciar
CMD ["npm", "start"]
