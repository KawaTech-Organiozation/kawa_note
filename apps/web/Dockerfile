# =============================================================================
# KawaMyCenter Frontend - Production Dockerfile
# Multi-stage build for React + Vite SPA
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: deps
# Responsibility: Install dependencies with maximum cache efficiency
# -----------------------------------------------------------------------------
# Debian slim (glibc), nao alpine (musl): o package-lock.json e gerado em glibc
# e registra o binario do Rollup para essa plataforma. Em alpine, `npm ci` nao
# baixa a variante musl e o build quebra com
# "Cannot find module @rollup/rollup-linux-x64-musl".
# `slim` em vez do node:20 completo: mesma glibc, ~200MB em vez de ~1.1GB.
# Os stages de build sao descartados; a imagem final continua sendo nginx:alpine.
FROM node:20-slim AS deps

WORKDIR /app

# Monorepo npm workspaces: lockfile unico na raiz, entao o contexto de build
# e a raiz. Copiar so os manifests primeiro preserva o cache de camada.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/

# `npm ci` (e nao `npm install`) e o que de fato garante determinismo: instala
# exatamente o que esta no package-lock.json e falha se os dois divergirem.
# O cache mount mantem o store do npm entre builds.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w @kawa-note/web

# -----------------------------------------------------------------------------
# STAGE 2: build
# Responsibility: Compile the application
# -----------------------------------------------------------------------------
FROM node:20-slim AS build

WORKDIR /app

# Dependencias ficam hoisted na raiz do workspace.
COPY --from=deps /app/node_modules ./node_modules

COPY package.json package-lock.json ./
COPY apps/web ./apps/web

# Accept build arguments for environment variables
ARG VITE_APP_NAME=KawaMyCenter
ARG VITE_KAWA_APP_ID=test-app
ARG VITE_KAWA_FUNCTIONS_VERSION=v1
ARG VITE_KAWA_APP_BASE_URL=http://localhost:3116
ARG VITE_CEP_API_URL=

# Set environment variables for build (Vite bakes these into the bundle at build time)
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_KAWA_APP_ID=${VITE_KAWA_APP_ID}
ENV VITE_KAWA_FUNCTIONS_VERSION=${VITE_KAWA_FUNCTIONS_VERSION}
ENV VITE_KAWA_APP_BASE_URL=${VITE_KAWA_APP_BASE_URL}
ENV VITE_CEP_API_URL=${VITE_CEP_API_URL}

# Build the application
WORKDIR /app/apps/web
RUN npm run build

# -----------------------------------------------------------------------------
# STAGE 3: runtime
# Responsibility: Serve static files with minimal footprint
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Create non-root user for nginx (nginx user already exists in nginx image)
RUN addgroup -g 1001 -S nginx-app && adduser -S nginx-app -u 1001

# Set ownership of nginx html directory
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html

# nginx sempre escuta 80 dentro do container; o mapeamento para FRONTEND_PORT
# acontece no Compose. Usar ${FRONTEND_PORT} aqui gerava um EXPOSE vazio, já
# que o ARG não existe neste stage.
EXPOSE 80

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
