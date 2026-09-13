# ProofLedger – Live Demo Walkthrough & Technical Q&A Guide

This guide is designed for technical interviewers, hiring managers, and portfolio evaluators to walk through a live demonstration of **ProofLedger** in 3–5 minutes, followed by deep-dive answers to common engineering and architecture questions.

---

## 🎬 3–5 Minute Demonstration Script

### Step 1: Login & Multi-Tenant Dashboard (0:00 - 0:45)
1. Open `http://localhost:3001` in your browser.
2. Log in as Lead Investigator:
   * **Email**: `investigator@proofledger.org`
   * **Password**: `Password123!`
3. Observe the **Dashboard Overview**:
   * Multi-tenant switcher displaying **Cyber Forensics Unit**.
   * Metrics summary showing active cases, evidence items, and pending reviews.

### Step 2: Case Management & Access Control (0:45 - 1:30)
1. Click **Cases** in the sidebar navigation.
2. Select **`CASE-2026-8801` – Operation DarkNet Intrusion**.
3. View case details, assigned case members (`Sarah Connor` as Lead Investigator, `Alex Chen` as Investigator, `Marcus Wright` as Reviewer), and existing evidence list.

### Step 3: Evidence Upload & SHA-256 Hash Computation (1:30 - 2:30)
1. Click **Upload Digital Evidence** in the case detail view.
2. Upload a sample file (e.g., a disk image, RAM log, or document).
3. The system client automatically streams the file to secure MinIO S3 storage via a **Pre-signed S3 Upload URL** while NestJS computes and records its **SHA-256 checksum**.
4. Observe the newly created Evidence entry with its unique Evidence Number (e.g., `EVI-2026-0004`) and 64-character SHA-256 hash.

### Step 4: Cryptographic Integrity Verification & Chain of Custody (2:30 - 3:30)
1. Click on the newly uploaded evidence item to view its details.
2. Click **Verify Cryptographic Hash**.
3. The system re-downloads the file stream from MinIO, recomputes the live SHA-256 hash, and compares it against the database record. A green **"INTEGRITY VERIFIED"** badge confirms zero tamper detected.
4. Scroll to **Chain of Custody** and click **Add Custody Event**. Select `TRANSFER` or `ANALYSIS`, fill in location and notes, and submit. Observe the instant append-only timeline entry.

### Step 5: Peer Review & Approval Workflow (3:30 - 4:15)
1. On the evidence page, click **Submit for Review**.
2. Select Reviewer: `Marcus Wright` (`auditor@proofledger.org`).
3. Log out and log in as the Auditor:
   * **Email**: `auditor@proofledger.org`
   * **Password**: `Password123!`
4. Navigate to **Reviews** in the sidebar. Click into the pending review task.
5. Provide reviewer comments ("Verified SHA-256 match against initial acquisition log. Approved for court submission.") and click **Approve Evidence**.
6. The evidence status transitions to `APPROVED`.

### Step 6: System Audit Log Inspection (4:15 - 5:00)
1. Log in as Super Admin (`admin@proofledger.org` / `Password123!`).
2. Navigate to **Audit Logs** (`/audit-logs`).
3. Inspect the comprehensive timeline of events (`CASE_CREATED`, `EVIDENCE_UPLOADED`, `CUSTODY_EVENT_ADDED`, `REVIEW_DECISION`).
4. Click **Inspect Payload** to view the full JSON audit diff including actor ID, client IP address, and resource metadata.

---

## 🙋‍♂️ 12 Technical Q&A for Interviewers

### Q1: How is SHA-256 cryptographic verification implemented?
**Answer**: When digital evidence is uploaded, the NestJS API streams the incoming file buffer through Node.js `crypto.createHash('sha256')`. The resulting 64-character hexadecimal digest is permanently stored alongside the file metadata in PostgreSQL. When verification is requested (`/evidence/:id/verify-hash`), the server streams the raw object directly from private MinIO storage, calculates the live hash, and performs a constant-time comparison against the stored digest. If a single bit differs, verification fails and alerts the investigator to physical file tampering.

### Q2: How does ProofLedger handle file storage securely without exposing S3 credentials?
**Answer**: ProofLedger utilizes an isolated MinIO object storage bucket with private access permissions. Frontend clients never interact directly with MinIO credentials. Instead, when an upload or download is requested, the NestJS API validates user JWT permissions against the target Case/Evidence, and issues a short-lived **S3 Pre-signed URL** (valid for 15 minutes). The client uploads/downloads directly via the S3 URL, minimizing server memory overhead for large forensic files.

### Q3: Explain the multi-tenant Organization and Case RBAC model.
**Answer**: Access control is enforced via a two-layer RBAC architecture:
1. **Organization RBAC**: Users belong to Organizations via `OrganizationMember` with roles (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`). High-level administrative actions (e.g., managing org members or viewing org-wide audit logs) require `OrgRole.OWNER` or `ADMIN`.
2. **Case Access Control**: Within an organization, cases are restricted to assigned users via `CaseMember` with roles (`LEAD_INVESTIGATOR`, `INVESTIGATOR`, `REVIEWER`, `VIEWER`). Custom NestJS Guards (`OrgRoleGuard`, `CaseMemberGuard`) inspect request parameters and JWT payloads on every endpoint.

### Q4: What happens if an evidence file is altered on MinIO storage?
**Answer**: If a rogue actor or storage error corrupts the underlying object on S3/MinIO, the stored SHA-256 hash in PostgreSQL remains un-tampered. When any investigator or court official runs the **Integrity Check** endpoint, the server reads the corrupted file, computes a mismatching SHA-256 hash, immediately updates the evidence status, logs an `INTEGRITY_FAILED` event in the audit trail, and flags the item in the UI.

### Q5: How are Chain of Custody records made immutable?
**Answer**: In the database schema, `CustodyEvent` is designed as an append-only ledger. There are no update or delete endpoints exposed in the API for custody events. Every event captures `evidenceId`, `performedById`, `eventType`, `location`, `notes`, `digitalSignature`, and an automated database timestamp (`createdAt`). Any attempt to alter custody events requires direct database superuser access, which is tracked by PostgreSQL query logs.

### Q6: How does the Review & Approval workflow interact with Evidence status?
**Answer**: When an investigator requests a review, a `Review` entity is created in `PENDING` state and the evidence status updates to `IN_REVIEW`. The assigned reviewer inspects the evidence, metadata, and custody chain. Upon submitting a decision (`APPROVED` or `REJECTED`), the `Review` record is updated with reviewer ID, timestamp, and comments, while the `Evidence` status transitions to `APPROVED` or returns to `COLLECTED` for revision.

### Q7: How is Audit Logging decoupled from core domain logic?
**Answer**: The `AuditLog` service is injected across NestJS domain modules. Whenever critical mutations occur (case creation, evidence upload, review decisions, user membership changes), an asynchronous audit log entry is dispatched containing `userId`, `organizationId`, `action`, `resource`, `resourceId`, `details` (JSON payload), `ipAddress`, and `userAgent`. This allows uniform compliance tracking without cluttering domain logic.

### Q8: How is route authorization and authentication implemented in NestJS?
**Answer**: Authentication relies on Passport.js with `JwtStrategy`, extracting Bearer tokens from request HTTP headers. Route authorization uses custom NestJS Decorators (`@Roles()`, `@RequireCaseRole()`) paired with `Reflector` in NestJS Guards (`JwtAuthGuard`, `OrgRoleGuard`, `CaseRoleGuard`). Unauthenticated or unauthorized requests are rejected at the guard layer before controller handlers execute.

### Q9: Why did you choose Prisma ORM and how are migrations handled?
**Answer**: Prisma provides strict TypeScript type safety, declarative schema modeling, auto-generated migration history, and relational query optimization. Migrations are managed via `npx prisma migrate dev` in development and `npx prisma migrate deploy` in production pipelines. Seed data is managed via an idempotent script (`prisma/seed.ts`) using `upsert` queries to prevent duplicate records.

### Q10: How is the Next.js frontend structured and styled?
**Answer**: The web client uses Next.js 14 with the **App Router**, structured around route modules (`/cases`, `/evidence`, `/reviews`, `/audit-logs`). The UI follows a modern dark glassmorphic design language using custom CSS variables, Tailwind utility classes, Lucide icons, and responsive layouts (`DashboardLayout`). Client-side state and token management handle session persistence cleanly.

### Q11: What security hardening measures were implemented in Phase 8?
**Answer**: Production hardening includes:
* **Helmet.js**: Sets security HTTP headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`).
* **Strict CORS**: Restricts cross-origin requests to configured frontend origins.
* **Rate Limiting**: `nestjs/throttler` protects API routes against brute-force and DDoS attacks.
* **Validation Pipes**: NestJS global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips unexpected input properties.

### Q12: How is the system deployed using Docker Compose?
**Answer**: ProofLedger features multi-stage Dockerfiles for both `apps/api` and `apps/web`. `docker-compose.prod.yml` orchestrates four containerized services:
1. `postgres`: PostgreSQL 16 database with healthcheck retries.
2. `minio`: S3 object storage with automated bucket creation.
3. `api`: NestJS application container running node production build.
4. `web`: Next.js production server serving static assets and dynamic routes.
Containers communicate across an isolated internal Docker bridge network (`proofledger_network`).
