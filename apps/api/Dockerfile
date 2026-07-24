# =============================================================================
# Kawa Note API - Production Dockerfile
# Multi-stage build for Node.js/Fastify + Prisma + PostgreSQL
#
# Base Debian slim (glibc), nao Alpine (musl), por dois motivos concretos:
#   - `bcrypt` e modulo nativo e nao publica binario para musl. Em Alpine ele
#     compila do fonte via node-pre-gyp, o que levava horas.
#   - Os engines do Prisma para musl exigem libssl1.1, ausente no Alpine atual
#     ("Error loading shared library libssl.so.1.1").
# O custo e ~70MB a mais na imagem final; o ganho e build em minutos.
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 0: base
# Responsibility: Unica fonte da imagem base, com o openssl que o Prisma exige.
#
# O node:20-slim embarca o proprio OpenSSL e nao instala nenhuma libssl de
# sistema. Sem ela o Prisma nao consegue detectar a versao, cai no fallback
# "openssl-1.1.x" e baixa engines que pedem libssl.so.1.1 — ausente no bookworm,
# que usa OpenSSL 3. O sintoma e um `Schema engine error:` sem mensagem no
# migrate. Instalar openssl (que traz libssl3) faz o Prisma detectar 3.0.x e
# baixar os engines certos, tanto no `npm ci` quanto na execucao.
#
# Todos os stages herdam daqui para que a lib exista no build E no runtime.
# -----------------------------------------------------------------------------
FROM node:20-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# STAGE 1: deps
# Responsibility: Install all dependencies (devDependencies incluidas — o CLI
# do Prisma e devDependency e e necessario para `prisma generate`)
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Monorepo npm workspaces: o lockfile e unico e vive na raiz, entao o contexto
# de build e a raiz. Copiamos so os manifests primeiro para preservar o cache
# de camada quando apenas o codigo muda.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

# O cache mount mantem o store do npm entre builds: sem ele, todo build
# rebaixa todos os pacotes.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --silent -w @kawa-note/api

# -----------------------------------------------------------------------------
# STAGE 2: deps-prod
# Responsibility: Somente as dependencias de execucao. Serve a imagem final,
# que assim nao embarca prisma CLI, vitest, supertest nem eslint.
# -----------------------------------------------------------------------------
FROM base AS deps-prod

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --silent --omit=dev -w @kawa-note/api

# -----------------------------------------------------------------------------
# STAGE 3: build
# Responsibility: Gerar o Prisma Client UMA unica vez.
#
# Herda de `deps` em vez de copiar o node_modules: evita duplicar uma camada de
# centenas de MB. O cliente gerado e depois reaproveitado por migrate e runtime.
# -----------------------------------------------------------------------------
FROM deps AS build

COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npx prisma generate

# -----------------------------------------------------------------------------
# STAGE 4: migrate
# Responsibility: Execute database migrations + seed mandatory catalog data
# Container is ephemeral - runs once and exits
#
# Sequence (both must succeed):
#   1. prisma migrate deploy  — apply pending migrations
#   2. node prisma/seed-plans.js — upsert subscription_plans catalog (idempotent)
#
# seed-plans.js is NOT optional: the onboarding flow requires plans to exist
# in the database. Running it here guarantees consistency on every deploy.
# -----------------------------------------------------------------------------
FROM base AS migrate

WORKDIR /app

# Precisa do node_modules completo: o CLI do Prisma roda as migrations.
# O cliente ja gerado vem do stage build, sem novo `prisma generate`.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY apps/api/package.json ./package.json
COPY apps/api/prisma ./prisma

# Run migrations then seed mandatory catalog data.
# Uses sh -c so both commands share the same exit code chain (&&).
# First, resolve any failed migrations, then deploy pending ones.
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20260220000000_add_user_sessions 2>/dev/null || true && npx prisma migrate deploy && node prisma/seed-plans.js"]

# -----------------------------------------------------------------------------
# STAGE 5: runtime
# Responsibility: Serve the application with minimal footprint
# -----------------------------------------------------------------------------
FROM base AS runtime

WORKDIR /app

# Create non-root user for security (principle of least privilege)
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -s /usr/sbin/nologin nodejs

# `COPY --chown` faz a atribuicao durante a copia; um `chown -R` posterior
# percorreria centenas de MB e duplicaria a camada inteira.
COPY --from=deps-prod --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nodejs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --chown=nodejs:nodejs apps/api/package.json ./package.json
COPY --chown=nodejs:nodejs apps/api/prisma ./prisma
COPY --chown=nodejs:nodejs apps/api/src ./src

USER nodejs

# 3115 é a porta da API na convenção do projeto (o nginx do frontend faz
# proxy_pass para kawa-note-api:3115).
EXPOSE 3115

# Healthcheck pelo fetch global do Node 20: evita instalar wget so para isso.
# A porta vem de PORT (e o que o Compose injeta), com 3115 como padrao.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3115)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start application
CMD ["node", "src/server.js"]
