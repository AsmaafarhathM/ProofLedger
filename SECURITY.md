# ProofLedger Security Architecture & Policies

This document outlines the security architecture, threat model, authentication mechanisms, authorization controls, and cryptographic integrity measures implemented across the **ProofLedger – Secure Digital Evidence Management Platform**.

---

## 🔒 1. Core Security Principles

ProofLedger operates under a zero-trust model for digital evidence custody:

1. **Cryptographic Tamper-Evident Hashing**: Every digital evidence file uploaded is immediately hashed using SHA-256 before storage. Integrity check endpoints (`POST /evidence/:id/verify-integrity`) recalculate raw byte streams from MinIO/S3 and compare against database records.
2. **Multi-Tenant Isolation**: Data is scoped strictly by `Organization` and `Case` boundaries. Access control guards reject cross-tenant and unassigned case queries at the NestJS service layer.
3. **Separation of Duties**: Reviewers cannot audit or approve digital evidence items that they uploaded (`evidence.createdById !== reviewer.id`).
4. **Least-Privilege RBAC**: Scoped organization roles (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`) and case roles (`LEAD_INVESTIGATOR`, `INVESTIGATOR`, `REVIEWER`, `VIEWER`).
5. **Immutable Chain-of-Custody**: All evidence state changes (creation, transfer, audit, review request, decision, cancellation) generate append-only `CustodyEvent` and `AuditLog` records.

---

## 🛡️ 2. Transport & Infrastructure Security

- **Security Headers**: Managed via `helmet` (Strict-Transport-Security, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy).
- **CORS Policy**: Configurable origins restricted via `CORS_ORIGIN` environment variable.
- **Request Body & Upload Limits**: Default binary upload capped at `MAX_FILE_SIZE` (50MB default).
- **Rate Limiting**: Globally enforced via `@nestjs/throttler` (`THROTTLE_TTL=60`, `THROTTLE_LIMIT=100`) preventing brute-force login and denial-of-service attempts.
- **Secret Scrubbing**: Automatic HTTP request logger redacting `password`, `token`, `authorization`, and `secret` parameters.

---

## 🔑 3. Authentication & Password Hashing

- **Passwords**: Hashed with `bcryptjs` using a salt round of 10. Passwords are never returned in API payloads.
- **JWT Authorization**: Signed using HMAC-SHA256 with secret specified in `JWT_SECRET`. Tokens expire in `JWT_EXPIRES_IN` (1d default).
- **Mass Assignment Protection**: Global `ValidationPipe` configured with `whitelist: true`, `transform: true`, and `forbidNonWhitelisted: true`.

---

## 🚨 4. Security Incident Reporting

To report security vulnerabilities or exposure concerns, please contact security@proofledger.org or follow responsible disclosure guidelines.
