# ========== Stage 1: Build do Frontend ==========
FROM node:22-alpine AS build

WORKDIR /app

# Copiar arquivos de dependência primeiro (aproveita cache do Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código-fonte e fazer build
COPY . .
RUN npm run build

# ========== Stage 2: Produção ==========
FROM node:22-alpine AS production

WORKDIR /app

# Copiar package files e instalar apenas produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar servidor backend
COPY server/ ./server/

# Copiar frontend compilado do stage anterior
COPY --from=build /app/dist ./dist/

# Copiar entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expor porta
EXPOSE 3000

# Entrypoint: aguarda banco, roda setup, inicia servidor
ENTRYPOINT ["./docker-entrypoint.sh"]
