# ProofLedger Production Deployment Guide

This guide details the deployment procedures for running **ProofLedger** in staging and production environments using Docker Compose or Kubernetes.

---

## 📋 1. Prerequisites

- **Node.js**: v20.x or higher
- **Docker & Docker Compose**: Docker Engine 24+ / Compose v2+
- **PostgreSQL**: 16+
- **MinIO / AWS S3**: Object storage compatible with AWS S3 API

---

## ⚙️ 2. Environment Configuration

Copy `.env.example` to `.env` in `apps/api`:

```bash
cp apps/api/.env.example apps/api/.env
```

Ensure the following variables are set with strong production values:

```env
DATABASE_URL="postgresql://proofledger_user:SECURE_PROD_PASSWORD@postgres:5432/proofledger_db?schema=public"
JWT_SECRET="STRONG_64_CHAR_RANDOM_HMAC_KEY"
JWT_EXPIRES_IN="1d"
CORS_ORIGIN="https://proofledger.yourdomain.com"
API_PORT=3000
NODE_ENV="production"
ENABLE_SWAGGER=false
SWAGGER_PATH="docs"

MINIO_ENDPOINT="minio"
MINIO_PORT=9000
MINIO_ACCESS_KEY="STRONG_MINIO_ACCESS_KEY"
MINIO_SECRET_KEY="STRONG_MINIO_SECRET_KEY"
MINIO_BUCKET="proofledger-evidence-prod"
MAX_FILE_SIZE=52428800

THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 🐳 3. Deployment via Docker Compose

Run the production Docker Compose setup:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Services Started:
- **`postgres`**: PostgreSQL database exposed on port `5433` (internal `5432`).
- **`minio`**: Private object storage on port `9090` (console `9091`).
- **`api`**: NestJS backend API container on port `3000` (runs as non-root user `nestjs`).
- **`web`**: Next.js frontend standalone container on port `3001` (runs as non-root user `nextjs`).

---

## 🗄️ 4. Database Migrations

Apply production migrations without wiping data:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

For initial local development setup with demo data:

```bash
cd apps/api
npx prisma db push
npx prisma db seed
```
