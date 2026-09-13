import {
  PrismaClient,
  GlobalRole,
  OrgRole,
  CaseRole,
  CaseStatus,
  EvidenceStatus,
  CustodyEventType,
  ReviewStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ProofLedger production-ready demo database...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // --------------------------------------------------------
  // 1. Create Users
  // --------------------------------------------------------
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@proofledger.org' },
    update: {},
    create: {
      email: 'admin@proofledger.org',
      passwordHash,
      firstName: 'Chief',
      lastName: 'Administrator',
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  });

  const investigatorUser = await prisma.user.upsert({
    where: { email: 'investigator@proofledger.org' },
    update: {},
    create: {
      email: 'investigator@proofledger.org',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      globalRole: GlobalRole.USER,
    },
  });

  const analystUser = await prisma.user.upsert({
    where: { email: 'analyst@proofledger.org' },
    update: {},
    create: {
      email: 'analyst@proofledger.org',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Chen',
      globalRole: GlobalRole.USER,
    },
  });

  const auditorUser = await prisma.user.upsert({
    where: { email: 'auditor@proofledger.org' },
    update: {},
    create: {
      email: 'auditor@proofledger.org',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Wright',
      globalRole: GlobalRole.USER,
    },
  });

  console.log('Created Users: admin, investigator, analyst, auditor.');

  // --------------------------------------------------------
  // 2. Create Organizations
  // --------------------------------------------------------
  const orgCyber = await prisma.organization.upsert({
    where: { slug: 'cyber-forensics-unit' },
    update: {},
    create: {
      name: 'Cyber Forensics Unit',
      slug: 'cyber-forensics-unit',
      description: 'Federal Digital Evidence & Cyber Crime Investigation Unit',
    },
  });

  const orgFinancial = await prisma.organization.upsert({
    where: { slug: 'financial-crimes-div' },
    update: {},
    create: {
      name: 'Financial Crimes Division',
      slug: 'financial-crimes-div',
      description: 'Special Investigation Taskforce for Financial Fraud & Anti-Money Laundering',
    },
  });

  console.log('Created Organizations: Cyber Forensics Unit, Financial Crimes Division.');

  // --------------------------------------------------------
  // 3. Organization Memberships
  // --------------------------------------------------------
  const orgMembers = [
    { userId: adminUser.id, orgId: orgCyber.id, role: OrgRole.OWNER },
    { userId: investigatorUser.id, orgId: orgCyber.id, role: OrgRole.ADMIN },
    { userId: analystUser.id, orgId: orgCyber.id, role: OrgRole.MEMBER },
    { userId: auditorUser.id, orgId: orgCyber.id, role: OrgRole.MEMBER },
    { userId: adminUser.id, orgId: orgFinancial.id, role: OrgRole.OWNER },
    { userId: investigatorUser.id, orgId: orgFinancial.id, role: OrgRole.MEMBER },
  ];

  for (const om of orgMembers) {
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: om.userId,
          organizationId: om.orgId,
        },
      },
      update: { role: om.role },
      create: {
        userId: om.userId,
        organizationId: om.orgId,
        role: om.role,
      },
    });
  }

  // --------------------------------------------------------
  // 4. Create Cases
  // --------------------------------------------------------
  const caseCyber = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-8801' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-8801',
      title: 'Operation DarkNet Intrusion',
      description: 'Investigation into corporate network breach and exfiltrated digital artifacts',
      status: CaseStatus.ACTIVE,
      organizationId: orgCyber.id,
      createdById: investigatorUser.id,
    },
  });

  const caseFinancial = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-9042' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-9042',
      title: 'Project Financial Ledger Audit',
      description: 'Forensic audit of offshore shell accounts and wire transaction logs',
      status: CaseStatus.ACTIVE,
      organizationId: orgFinancial.id,
      createdById: adminUser.id,
    },
  });

  console.log('Created Cases: CASE-2026-8801, CASE-2026-9042.');

  // --------------------------------------------------------
  // 5. Case Memberships
  // --------------------------------------------------------
  const caseMembers = [
    { caseId: caseCyber.id, userId: investigatorUser.id, role: CaseRole.LEAD_INVESTIGATOR },
    { caseId: caseCyber.id, userId: analystUser.id, role: CaseRole.INVESTIGATOR },
    { caseId: caseCyber.id, userId: auditorUser.id, role: CaseRole.REVIEWER },
    { caseId: caseFinancial.id, userId: adminUser.id, role: CaseRole.LEAD_INVESTIGATOR },
    { caseId: caseFinancial.id, userId: investigatorUser.id, role: CaseRole.INVESTIGATOR },
  ];

  for (const cm of caseMembers) {
    await prisma.caseMember.upsert({
      where: {
        caseId_userId: {
          caseId: cm.caseId,
          userId: cm.userId,
        },
      },
      update: { role: cm.role },
      create: {
        caseId: cm.caseId,
        userId: cm.userId,
        role: cm.role,
      },
    });
  }

  // --------------------------------------------------------
  // 6. Digital Evidence Items
  // --------------------------------------------------------
  const evi1 = await prisma.evidence.upsert({
    where: { evidenceNumber: 'EVI-2026-0001' },
    update: {},
    create: {
      evidenceNumber: 'EVI-2026-0001',
      title: 'Volatile RAM Memory Capture',
      description: 'Physical RAM dump acquired live from Domain Controller server host',
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      fileSizeBytes: BigInt(4294967296),
      mimeType: 'application/octet-stream',
      status: EvidenceStatus.ANALYZING,
      caseId: caseCyber.id,
      createdById: investigatorUser.id,
    },
  });

  const evi2 = await prisma.evidence.upsert({
    where: { evidenceNumber: 'EVI-2026-0002' },
    update: {},
    create: {
      evidenceNumber: 'EVI-2026-0002',
      title: 'Encrypted Crypto Wallet Backup',
      description: 'Keystore JSON file recovered from suspect workstation disk image',
      fileHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      fileSizeBytes: BigInt(1048576),
      mimeType: 'application/json',
      status: EvidenceStatus.IN_CUSTODY,
      caseId: caseCyber.id,
      createdById: analystUser.id,
    },
  });

  const evi3 = await prisma.evidence.upsert({
    where: { evidenceNumber: 'EVI-2026-0003' },
    update: {},
    create: {
      evidenceNumber: 'EVI-2026-0003',
      title: 'Exfiltrated Executive Email Archives',
      description: 'PST mailbox export containing illicit correspondence and contract drafts',
      fileHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      fileSizeBytes: BigInt(157286400),
      mimeType: 'application/vnd.ms-outlook',
      status: EvidenceStatus.COLLECTED,
      caseId: caseFinancial.id,
      createdById: adminUser.id,
    },
  });

  console.log('Created Evidence: EVI-2026-0001, EVI-2026-0002, EVI-2026-0003.');

  // --------------------------------------------------------
  // 7. Custody Events
  // --------------------------------------------------------
  const existingEventsCount = await prisma.custodyEvent.count({
    where: { evidenceId: evi1.id },
  });

  if (existingEventsCount === 0) {
    await prisma.custodyEvent.createMany({
      data: [
        {
          evidenceId: evi1.id,
          performedById: investigatorUser.id,
          eventType: CustodyEventType.COLLECTION,
          location: 'HQ Server Room - Rack B04',
          notes: 'Evidence acquired live via FTK Imager CLI',
        },
        {
          evidenceId: evi1.id,
          performedById: analystUser.id,
          eventType: CustodyEventType.TRANSFER,
          location: 'Forensic Station 01',
          notes: 'Transferred RAM image for Volatility framework analysis',
        },
        {
          evidenceId: evi2.id,
          performedById: analystUser.id,
          eventType: CustodyEventType.COLLECTION,
          location: 'Evidence Locker Alpha',
          notes: 'Carved file from DD image copy',
        },
        {
          evidenceId: evi3.id,
          performedById: adminUser.id,
          eventType: CustodyEventType.COLLECTION,
          location: 'Secure Cloud Vault',
          notes: 'Direct cloud storage acquisition',
        },
      ],
    });
    console.log('Created Custody Events.');
  }

  // --------------------------------------------------------
  // 8. Reviews
  // --------------------------------------------------------
  const existingReviewsCount = await prisma.review.count({
    where: { evidenceId: evi1.id },
  });

  if (existingReviewsCount === 0) {
    await prisma.review.create({
      data: {
        evidenceId: evi1.id,
        reviewerId: auditorUser.id,
        status: ReviewStatus.IN_PROGRESS,
        comments: 'Conducting forensic validation of memory injection strings.',
      },
    });
    console.log('Created Evidence Review.');
  }

  // --------------------------------------------------------
  // 9. Audit Logs
  // --------------------------------------------------------
  const existingAuditLogsCount = await prisma.auditLog.count({
    where: { organizationId: orgCyber.id },
  });

  if (existingAuditLogsCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          userId: adminUser.id,
          organizationId: orgCyber.id,
          action: 'ORGANIZATION_CREATED',
          resource: 'Organization',
          resourceId: orgCyber.id,
          details: { name: 'Cyber Forensics Unit' },
          ipAddress: '127.0.0.1',
          userAgent: 'ProofLedger Seed Script',
        },
        {
          userId: investigatorUser.id,
          organizationId: orgCyber.id,
          action: 'CASE_CREATED',
          resource: 'Case',
          resourceId: caseCyber.id,
          details: { caseNumber: 'CASE-2026-8801', title: 'Operation DarkNet Intrusion' },
          ipAddress: '127.0.0.1',
          userAgent: 'ProofLedger Seed Script',
        },
        {
          userId: investigatorUser.id,
          organizationId: orgCyber.id,
          action: 'EVIDENCE_UPLOADED',
          resource: 'Evidence',
          resourceId: evi1.id,
          details: { evidenceNumber: 'EVI-2026-0001', title: 'Volatile RAM Memory Capture' },
          ipAddress: '127.0.0.1',
          userAgent: 'ProofLedger Seed Script',
        },
        {
          userId: analystUser.id,
          organizationId: orgCyber.id,
          action: 'CUSTODY_EVENT_ADDED',
          resource: 'CustodyEvent',
          resourceId: evi1.id,
          details: { eventType: 'TRANSFER', location: 'Forensic Station 01' },
          ipAddress: '127.0.0.1',
          userAgent: 'ProofLedger Seed Script',
        },
        {
          userId: auditorUser.id,
          organizationId: orgCyber.id,
          action: 'REVIEW_REQUESTED',
          resource: 'Review',
          resourceId: evi1.id,
          details: { status: 'IN_REVIEW', reviewer: 'Marcus Wright' },
          ipAddress: '127.0.0.1',
          userAgent: 'ProofLedger Seed Script',
        },
      ],
    });
    console.log('Created Audit Logs.');
  }

  console.log('\n==================================================');
  console.log('ProofLedger Demo Database Seeding Complete!');
  console.log('==================================================');
  console.log('Demo Credentials (Password for all: Password123!):');
  console.log('  1. Super Admin:   admin@proofledger.org');
  console.log('  2. Investigator:  investigator@proofledger.org');
  console.log('  3. Analyst:       analyst@proofledger.org');
  console.log('  4. Auditor:       auditor@proofledger.org');
  console.log('==================================================\n');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

