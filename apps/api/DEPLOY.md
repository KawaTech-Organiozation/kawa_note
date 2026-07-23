# Deploy Guide - KawaMyCenter Backend

## Overview

This guide covers deploying the KawaMyCenter backend stack (PostgreSQL + Fastify API) using Portainer with Docker Standalone.

**Architecture**: Multi-layer deployment with automatic migrations

---

## Prerequisites

1. **Docker** installed on the host
2. **Portainer CE/BE** running and accessible
3. **Docker Network** `kawatech-network` created
4. **Git repository** accessible by Portainer

---

## Step 1: Create Docker Network (One-time)

```bash
# SSH into the host and create the network
docker network create --subnet=10.10.0.0/16 kawatech-network

# Verify
docker network ls
docker network inspect kawatech-network
```

---

## Step 2: Configure Environment Variables

In Portainer, create a new Stack and configure these environment variables:

### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DOCKER_NETWORK_NAME` | External Docker network name | `kawatech-network` |
| `DOCKER_NETWORK_SUBNET` | Network subnet CIDR | `10.10.0.0/16` |
| `IP_KAWA_DB` | Static IP for PostgreSQL | `10.10.0.10` |
| `IP_KAWA_MIGRATE` | Static IP for migration container | `10.10.0.11` |
| `IP_KAWA_API` | Static IP for API container | `10.10.0.20` |
| `DB_USER` | PostgreSQL username | `kawa_user` |
| `DB_PASSWORD` | PostgreSQL password | `YourSecurePassword123!` |
| `DB_NAME` | PostgreSQL database name | `kawa_mycenter` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Generate with: `openssl rand -base64 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |

---

## Step 3: Deploy Backend Stack

### Option A: Git Repository (Recommended)

1. Go to **Portainer > Stacks > Add Stack**
2. Select **Repository**
3. Configure:
   - **Name**: `kawa-backend`
   - **Repository URL**: Your Git repo URL
   - **Repository Reference**: `refs/heads/main` (or your branch)
   - **Compose path**: `backend/docker-compose.yml`
   - **Authentication**: (if private repo)
4. Add all environment variables from Step 2
5. Click **Deploy the stack**

### Option B: Web Editor

1. Go to **Portainer > Stacks > Add Stack**
2. Select **Web Editor**
3. Copy contents of `backend/docker-compose.yml`
4. Paste into the editor
5. Add all environment variables from Step 2
6. Click **Deploy the stack**

---

## Deployment Flow

The stack deploys in the following order:

```
1. Portainer clones repository
2. Docker builds all images (deps → build → migrate → runtime)
3. Database container starts (waits for healthcheck)
4. Migration container runs (executes prisma migrate deploy)
5. API container starts (waits for migration to complete)
6. Stack enters stable state
```

**Key Behaviors**:
- Migration runs automatically on every deploy
- API will NOT start if migration fails
- Migration container exits after completion (restart: "no")
- Build cache is reused if package.json hasn't changed
- Prisma configuration is loaded from `prisma/prisma.config.ts` (Prisma 7+ compatible)

---

## Step 4: Verify Deployment

### Check Container Status

```bash
# List all containers
docker ps

# Expected output:
# kawa-api      (healthy)
# kawa-postgres (healthy)
# kawa-migrate  (exited 0)
```

### Check Health Endpoints

```bash
# Test API health
curl http://10.10.0.20:3000/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-07T..."}
```

### Check API Endpoints

```bash
# Test public endpoint
curl http://10.10.0.20:3000/api/apps/public/prod/public-settings/by-id/test-app

# Test auth (register)
curl -X POST http://10.10.0.20:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

---

## Step 5: (Optional) Seed Database

```bash
# SSH into the host
cd /path/to/project/backend

# Run seed
docker-compose exec api npm run db:seed

# Or create a one-off container:
docker-compose run --rm api npm run db:seed
```

**Demo Account Created:**
- Email: `demo@kawamycenter.com`
- Password: `demo123456`

---

## Step 6: Update Frontend Stack

1. Go to **Portainer > Stacks > kawa-frontend** (or your frontend stack name)
2. Add/Update environment variable:
   ```
   VITE_API_URL=http://10.10.0.20:3000
   ```
3. **Update the stack** (this will trigger a rebuild)
4. Wait for the build to complete

---

## Troubleshooting

### Migration Failures

```bash
# Check migration logs
docker logs kawa-migrate

# If migration fails, the API will not start
# Check API logs for dependency errors
docker logs kawa-api
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep kawa-postgres

# Check PostgreSQL logs
docker logs kawa-postgres

# Test connection from API container
docker-compose exec api sh -c "nc -zv 10.10.0.10 5432"
```

### API Not Starting

```bash
# Check API logs
docker logs kawa-api

# Check if environment variables are set
docker inspect kawa-api | grep -A 20 Env

# Verify migration completed
docker ps -a | grep kawa-migrate
```

### CORS Issues

Update the `CORS_ORIGIN` environment variable to match your frontend URL:
```
CORS_ORIGIN=http://10.10.0.30
```

---

## Network Architecture

```
kawatech-network (10.10.0.0/16)
├── 10.10.0.10 - PostgreSQL
├── 10.10.0.11 - Migration (ephemeral)
├── 10.10.0.20 - Backend API (Fastify)
└── 10.10.0.30 - Frontend (nginx) - SEPARATE STACK
```

---

## Maintenance

### View Logs

```bash
# API logs
docker logs -f kawa-api

# Database logs
docker logs -f kawa-postgres

# Migration logs (if needed)
docker logs kawa-migrate
```

### Restart Services

```bash
# Restart API
docker-compose restart api

# Restart database (CAUTION: will disconnect active connections)
docker-compose restart db
```

### Update Stack

1. Push changes to Git repository
2. Go to **Portainer > Stacks > kawa-backend**
3. Click **Pull and redeploy**
4. Select **Re-pull image and redeploy**

**Note**: Migration will run automatically on redeploy

---

## Security Notes

1. **Never commit `.env` files** - They are already in `.gitignore` and `.dockerignore`
2. **Use strong passwords** for `DB_PASSWORD` and `JWT_SECRET`
3. **Restrict CORS** in production to your frontend URL only
4. **Keep JWT_SECRET secure** - Changing it will invalidate all existing tokens

---

## Backup & Restore

### Backup Database

```bash
# Create backup
docker-compose exec db pg_dump -U kawa_user -d kawa_mycenter > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore from backup
docker-compose exec -T db psql -U kawa_user -d kawa_mycenter < backup_20250207.sql
```

---

## Build Performance

### First Deploy
- **Duration**: 3-5 minutes
- **Operations**: Dependency installation, Prisma generate, image layers

### Subsequent Deploys
- **Duration**: 30-60 seconds (if package.json unchanged)
- **Cache**: Docker layer cache reused for dependencies

### Optimization Tips
- Commit `package-lock.json` for deterministic builds
- Minimize changes to `package.json` between deploys
- Monitor disk space on Portainer host

---

## Support

For issues or questions, check:
- Container logs: `docker logs <container-name>`
- Stack status in Portainer UI
- Network connectivity: `docker network inspect kawatech-network`
