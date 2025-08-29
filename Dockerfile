FROM node:18-alpine

# 1. Cria diretório de trabalho
WORKDIR /app

# 2. Copia os arquivos do projeto
COPY . .

# 3. Verifica se a pasta frontend existe
RUN if [ ! -d "frontend" ]; then echo "ERRO: Pasta frontend não encontrada!" && ls -la; exit 1; fi

# 4. Muda para o diretório do frontend
WORKDIR /app/frontend

# 5. Instala as dependências
RUN npm install

# 6. Verifica se o public/index.html existe
RUN if [ ! -f "public/index.html" ]; then echo "ERRO: index.html não encontrado em public/!" && ls -la public/; exit 1; fi

# 7. Faz o build
RUN npm run build

# 8. Expõe a porta
EXPOSE 3000

# 9. Comando para iniciar
CMD ["npm", "start"]
