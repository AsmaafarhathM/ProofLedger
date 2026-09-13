# ProofLedger Operations & Maintenance Guide

This operations guide covers health monitoring, backup & recovery, logging, and troubleshooting routines for **ProofLedger**.

---

## 🏥 1. Health Monitoring & Probes

| Endpoint | Probe Type | Purpose | Expected Status |
| :--- | :--- | :--- | :--- |
| `GET /health/liveness` | Liveness | Verifies API HTTP server responsiveness | `200 OK` (`status: "ok"`) |
| `GET /health/readiness` | Readiness | Verifies DB & S3 bucket readiness | `200 OK` (`status: "healthy"`) |
| `GET /health/db` | DB Check | Returns user count and Prisma connectivity | `200 OK` (`status: "healthy"`) |

---

## 💾 2. PostgreSQL Backup & Restore

### Automated Backup Script
To create a timestamped database backup:

```bash
docker exec -t proofledger_postgres_prod pg_dump -U proofledger_user -d proofledger_db -F c -b -v -f /tmp/backup.dump
docker cp proofledger_postgres_prod:/tmp/backup.dump ./backups/proofledger_$(date +%Y%m%d_%H%M%S).dump
```

### Database Restore Procedure
To restore from a backup file:

```bash
docker cp ./backups/proofledger_20260913.dump proofledger_postgres_prod:/tmp/restore.dump
docker exec -t proofledger_postgres_prod pg_restore -U proofledger_user -d proofledger_db -v -c /tmp/restore.dump
```

---

## 📦 3. MinIO S3 Evidence Object Backup

To mirror evidence bucket objects to a backup directory:

```bash
mc alias set proofledger http://localhost:9090 proofledger_minio proofledger_minio_pass
mc mirror proofledger/proofledger-evidence ./backups/minio-evidence-mirror
```

---

## 📜 4. Structured Logging & Auditing

- **API Logs**: Container logs output JSON/plain text formatted HTTP logs with automated sensitive field scrubbing.
- **Audit Trail**: Every critical action generates a `AuditLog` database entry (`EVIDENCE_CREATED`, `EVIDENCE_REVIEW_REQUESTED`, `EVIDENCE_REVIEW_DECISION`, `CASE_CLOSED`).

---

## 🚨 5. Incident Response & Recovery

1. **DB Unreachable**: Check `docker compose logs postgres` and verify container health state (`docker inspect --format='{{json .State.Health}}' proofledger_postgres_prod`).
2. **Integrity Mismatch Alert**: Run `POST /evidence/:id/verify-integrity` via API to identify whether S3 storage objects or database hashes were mutated.
