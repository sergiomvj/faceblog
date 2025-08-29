# Usando Node.js 18
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /usr/src/app

# Primeiro copia apenas os arquivos de dependência
COPY package*.json ./

# Instala as dependências (incluindo as de desenvolvimento se necessário)
RUN npm ci --only=production

# Copia o restante do código
COPY . .

# Se usar TypeScript, adicione:
# RUN npm run build

# Porta que a API vai rodar
EXPOSE 5000

# Comando para iniciar o servidor
CMD ["node", "dist/main.js"]  # ou o caminho correto para seu arquivo de entrada
