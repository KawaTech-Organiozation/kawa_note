# =============================================================================
# Kawa Note Backend - Production Dockerfile
# Multi-stage build for Node.js/Fastify + Prisma + PostgreSQL
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: deps
# Responsibility: Install all dependencies (including devDependencies)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for maximum cache efficiency
COPY package*.json ./

# Install all dependencies (devDependencies needed for prisma generate)
RUN npm ci --silent && npm cache clean --force

# -----------------------------------------------------------------------------
# STAGE 2: build
# Responsibility: Generate Prisma client and prepare application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files and source code
COPY package*.json ./
COPY . .

# Generate Prisma client
RUN npx prisma generate

# -----------------------------------------------------------------------------
# STAGE 3: migrate
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
FROM node:20-alpine AS migrate

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma schema, seeds and package files
COPY package*.json ./
COPY prisma ./prisma

# Generate Prisma client from current schema so seed-plans.js has
# access to all models (including SubscriptionPlan).
RUN npx prisma generate

# Run migrations then seed mandatory catalog data.
# Uses sh -c so both commands share the same exit code chain (&&).
# First, resolve any failed migrations, then deploy pending ones.
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20260220000000_add_user_sessions 2>/dev/null || true && npx prisma migrate deploy && node prisma/seed-plans.js"]

# -----------------------------------------------------------------------------
# STAGE 4: runtime
# Responsibility: Serve the application with minimal footprint
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

# Install wget for healthcheck and openssl for Prisma
RUN apk add --no-cache wget openssl

# Create non-root user for security (principle of least privilege)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy production dependencies only
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy prisma schema (needed for runtime)
COPY prisma ./prisma

# Copy application code
COPY . .

# Set ownership of app directory to nodejs user
RUN chown -R nodejs:nodejs /app

# Regenerate Prisma client in runtime (needed for engine)
RUN npx prisma generate

# Switch to non-root user
USER nodejs

# 3115 é a porta da API na convenção do projeto (o nginx do frontend faz
# proxy_pass para kawa-note-api:3115). ${BACKEND_PORT} não existe como ARG
# neste stage e gerava um EXPOSE vazio.
EXPOSE 3115

# O Compose injeta a porta como PORT (não BACKEND_PORT); referenciar a
# variável errada quebrava o healthcheck quando a imagem roda fora do Compose.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3115}/health || exit 1

# Start application
CMD ["node", "src/server.js"]
