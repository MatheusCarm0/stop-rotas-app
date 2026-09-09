FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (melhor cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

# Copia o código
COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Roda TypeScript direto com tsx (sem etapa de build)
CMD ["npm", "run", "start"]
