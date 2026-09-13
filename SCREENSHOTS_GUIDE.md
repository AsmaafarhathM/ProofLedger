# ProofLedger – Portfolio Screenshots Guide

This guide outlines key screens and recommended capture angles for showcasing **ProofLedger** in portfolio presentations, GitHub README badges, or LinkedIn posts.

---

## 📸 Key Application Screenshots

### 1. 🔐 Multi-Tenant Dashboard & Case Management (`/dashboard`, `/cases`)
* **What it displays**: Dark glassmorphic interface, multi-tenant organization selector (**Cyber Forensics Unit**), key metric cards (Active Cases, Evidence Count, Pending Reviews), and recent investigation list.
* **Key highlight**: Professional UI aesthetics, responsive layout, and organization badge.

### 2. 🛡️ Digital Evidence Details & SHA-256 Hash Badge (`/cases/[id]/evidence/[id]`)
* **What it displays**: Evidence detail view showing evidence number (`EVI-2026-0001`), title, file size, MIME type, 64-character SHA-256 checksum, and green **"INTEGRITY VERIFIED"** status badge.
* **Key highlight**: Cryptographic integrity proof and live hash verification trigger button.

### 3. 📜 Immutable Chain of Custody Timeline (`/cases/[id]/evidence/[id]`)
* **What it displays**: Interactive chronological timeline mapping evidence custody events (Collection, Transfer, Analysis, Court Presentation) with handler names, location, and timestamp tags.
* **Key highlight**: Forensic chain-of-custody tracking.

### 4. ⚖️ Review & Approval Workflow Modal (`/reviews`)
* **What it displays**: Peer review dashboard displaying evidence submitted for supervisor approval, status pill (`IN_PROGRESS`, `APPROVED`), decision notes, and approval actions.
* **Key highlight**: Workflow automation and quality assurance for legal evidence.

### 5. 🔍 System Audit Log Timeline & JSON Inspector (`/audit-logs`)
* **What it displays**: Audit log table with action filters (`EVIDENCE_UPLOADED`, `CUSTODY_EVENT_ADDED`), organization selector, actor details, and the open JSON Metadata Inspector modal.
* **Key highlight**: Enterprise compliance auditing and security logging.

### 6. 📚 Interactive Swagger API Documentation (`http://localhost:3000/docs`)
* **What it displays**: OpenAPI / Swagger UI endpoint documentation grouped by modules (Auth, Organizations, Cases, Evidence, Custody, Reviews, Audit Logs).
* **Key highlight**: Robust backend REST API contract.
