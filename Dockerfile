# =============================================================================
# KawaMyCenter Frontend - Production Dockerfile
# Multi-stage build for React + Vite SPA
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: deps
# Responsibility: Install dependencies with maximum cache efficiency
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for optimal layer caching
COPY package*.json ./

# Install dependencies using lockfile for determinism
# Note: Commit package-lock.json to repository for full determinism
RUN npm install --legacy-peer-deps && npm cache clean --force

# -----------------------------------------------------------------------------
# STAGE 2: build
# Responsibility: Compile the application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

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
RUN npm run build

# -----------------------------------------------------------------------------
# STAGE 3: runtime
# Responsibility: Serve static files with minimal footprint
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user for nginx (nginx user already exists in nginx image)
RUN addgroup -g 1001 -S nginx-app && adduser -S nginx-app -u 1001

# Set ownership of nginx html directory
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html

# Expose port (parametrized via environment variable)
EXPOSE ${FRONTEND_PORT}

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
