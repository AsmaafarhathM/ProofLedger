# ProofLedger – Production Deployment Checklist & Hardening Guide

Use this checklist prior to deploying **ProofLedger** to production environments (AWS, GCP, Azure, or On-Premises Kubernetes / Docker Swarm).

---

## 🔒 1. Environment & Secret Management

- [ ] **Strong JWT Secrets**: Ensure `JWT_SECRET` in `apps/api/.env` is a cryptographically strong 256-bit key (e.g., generated via `openssl rand -base64 32`).
- [ ] **MinIO / S3 Credentials**: Replace default `minioadmin` access/secret keys with production AWS S3 IAM credentials or dedicated MinIO service account keys.
- [ ] **Database Passwords**: Ensure PostgreSQL production password is strong and set via environment variables (never committed to repository).
- [ ] **`NODE_ENV` Configuration**: Set `NODE_ENV=production` in both API and Web environment settings.
- [ ] **CORS Origin Restrictions**: Update `CORS_ORIGIN` in `apps/api/.env` to point exclusively to the production domain (e.g., `https://proofledger.yourdomain.com`).

---

## 🛡️ 2. Network & Storage Security

- [ ] **SSL / TLS Termination**: Enable HTTPS using Let's Encrypt, Cloudflare, or reverse proxies (Nginx / Caddy / AWS ALB).
- [ ] **MinIO Bucket Policies**: Ensure MinIO/S3 evidence bucket policy is set to private access only (no public read/write).
- [ ] **Database Network Isolation**: Bind PostgreSQL container port `5432` only to internal networks or private VPC subnets.
- [ ] **Rate Limiting Tuning**: Configure `THROTTLE_TTL` and `THROTTLE_LIMIT` in NestJS `apps/api/src/app.module.ts` based on expected traffic volume.

---

## 🗄️ 3. Database & Storage Maintenance

- [ ] **Automated Migrations**: Execute `npx prisma migrate deploy` in CD pipeline before application container startup.
- [ ] **PostgreSQL Backups**: Configure nightly pg_dump backups or cloud managed database snapshots (e.g., AWS RDS automated backups).
- [ ] **MinIO S3 Versioning**: Enable bucket object versioning to protect against accidental object deletion.

---

## 🚀 4. Production Docker Deployment

- [ ] **Container Image Builds**: Build multi-stage optimized Docker images:
  ```bash
  docker compose -f docker-compose.prod.yml build
  ```
- [ ] **Health Check Verification**: Verify container health status:
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
- [ ] **Logs Monitoring**: Set up log aggregation (Docker journald, Datadog, ELK, or CloudWatch).

---

## 🩺 5. Post-Deployment Smoke Test

- [ ] Navigate to `https://your-domain.com/health` (verify API returns `{ "status": "ok" }`).
- [ ] Log in with seeded admin user and verify JWT token issuance.
- [ ] Upload test evidence file and verify pre-signed upload URL completion.
- [ ] Trigger cryptographic SHA-256 hash verification on uploaded evidence.
- [ ] Confirm audit log entry generated under `/audit-logs`.
