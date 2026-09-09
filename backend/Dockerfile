FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (melhor cache). Inclui devDeps porque
# a app roda via tsx (TypeScript) em produção.
COPY package.json package-lock.json* ./
RUN npm install --include=dev

# Copia o código
COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Roda TypeScript direto com tsx (sem etapa de build)
CMD ["npm", "run", "start"]
