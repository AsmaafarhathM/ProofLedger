import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { CustodyEventType, EvidenceStatus, OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { QueryEvidenceDto } from './dto/query-evidence.dto';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/json',
  'video/mp4',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  private async verifyCaseAccess(userId: string, caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { organization: true },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    const orgMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: caseRecord.organizationId,
        },
      },
    });

    if (!orgMembership) {
      throw new ForbiddenException(
        'You do not belong to the organization governing this case',
      );
    }

    const isOrgAdmin =
      orgMembership.role === OrgRole.OWNER ||
      orgMembership.role === OrgRole.ADMIN;

    const caseMembership = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId,
          userId,
        },
      },
    });

    if (!caseMembership && !isOrgAdmin) {
      throw new ForbiddenException(
        'You do not have access to upload or view evidence in this case',
      );
    }

    return { caseRecord, isOrgAdmin, caseMembership };
  }

  async uploadEvidence(
    userId: string,
    caseId: string,
    file: Express.Multer.File,
    dto: UploadEvidenceDto,
  ) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file cannot be empty');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported MIME type: ${file.mimetype}. Allowed types: [${ALLOWED_MIME_TYPES.join(', ')}]`,
      );
    }

    const { caseRecord } = await this.verifyCaseAccess(userId, caseId);

    const existingEvidence = await this.prisma.evidence.findUnique({
      where: { evidenceNumber: dto.evidenceNumber },
    });

    if (existingEvidence) {
      throw new ConflictException(
        `Evidence number "${dto.evidenceNumber}" is already registered`,
      );
    }

    // 1. Calculate SHA-256 cryptographic integrity hash
    const sha256Hash = this.storageService.calculateSha256(file.buffer);

    // 2. Generate secure, safe storage key
    const sanitizedFilename = (file.originalname || 'evidence.bin')
      .replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `${caseId}/${Date.now()}-${randomUUID()}-${sanitizedFilename}`;

    // 3. Upload file to private object storage
    await this.storageService.uploadFile(storageKey, file.buffer, file.mimetype);

    // 4. Atomic database transaction with automatic cleanup on failure
    try {
      return await this.prisma.$transaction(async (tx) => {
        const evidence = await tx.evidence.create({
          data: {
            evidenceNumber: dto.evidenceNumber,
            title: dto.title,
            description: dto.description,
            fileUrl: storageKey,
            fileHash: sha256Hash,
            fileSizeBytes: BigInt(file.size),
            mimeType: file.mimetype,
            status: EvidenceStatus.COLLECTED,
            caseId,
            createdById: userId,
          },
        });

        await tx.custodyEvent.create({
          data: {
            evidenceId: evidence.id,
            performedById: userId,
            eventType: CustodyEventType.COLLECTION,
            notes: `Initial evidence collection & SHA-256 cryptographic hashing (${sha256Hash})`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            organizationId: caseRecord.organizationId,
            action: 'EVIDENCE_UPLOADED',
            resource: 'Evidence',
            resourceId: evidence.id,
            details: {
              evidenceNumber: evidence.evidenceNumber,
              caseId,
              fileSize: file.size,
              sha256Hash,
            },
          },
        });

        return {
          message: 'Evidence uploaded and secured successfully',
          evidence: {
            ...evidence,
            fileSizeBytes: Number(evidence.fileSizeBytes),
          },
        };
      });
    } catch (err) {
      // Transaction failed -> Cleanup storage object to prevent orphan files
      await this.storageService.deleteFile(storageKey);
      this.logger.error(`Database error during evidence upload. Cleaned up storage key: ${storageKey}`, err);
      throw err;
    }
  }

  async findAllForCase(userId: string, caseId: string, query: QueryEvidenceDto) {
    await this.verifyCaseAccess(userId, caseId);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      caseId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { evidenceNumber: { contains: query.search, mode: 'insensitive' } },
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const sortOrder = query.sort === 'oldest' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.evidence.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          createdBy: true,
          _count: {
            select: { custodyEvents: true, reviews: true },
          },
        },
      }),
      this.prisma.evidence.count({ where: whereCondition }),
    ]);

    const evidenceList = items.map((item) => ({
      ...item,
      fileSizeBytes: Number(item.fileSizeBytes),
      createdBy: this.usersService.sanitizeUser(item.createdBy),
    }));

    return {
      message: 'Evidence records retrieved successfully',
      evidence: evidenceList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: { include: { organization: true } },
        createdBy: true,
        custodyEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { performedBy: true },
        },
      },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }

    await this.verifyCaseAccess(userId, evidence.caseId);

    const sanitizedCustody = evidence.custodyEvents.map((ce) => ({
      ...ce,
      performedBy: this.usersService.sanitizeUser(ce.performedBy),
    }));

    return {
      message: 'Evidence details retrieved successfully',
      evidence: {
        ...evidence,
        fileSizeBytes: Number(evidence.fileSizeBytes),
        createdBy: this.usersService.sanitizeUser(evidence.createdBy),
        custodyEvents: sanitizedCustody,
      },
    };
  }

  async downloadEvidence(userId: string, evidenceId: string, res: Response) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { case: true },
    });

    if (!evidence || !evidence.fileUrl) {
      throw new NotFoundException('Evidence or file storage key not found');
    }

    await this.verifyCaseAccess(userId, evidence.caseId);

    const fileExists = await this.storageService.fileExists(evidence.fileUrl);
    if (!fileExists) {
      throw new NotFoundException('File binary not found in object storage');
    }

    // Log custody event & audit trail for file download
    await this.prisma.custodyEvent.create({
      data: {
        evidenceId,
        performedById: userId,
        eventType: CustodyEventType.CHECK_OUT,
        notes: `Evidence file binary downloaded by user`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        organizationId: evidence.case.organizationId,
        action: 'EVIDENCE_DOWNLOADED',
        resource: 'Evidence',
        resourceId: evidenceId,
        details: { evidenceNumber: evidence.evidenceNumber, caseId: evidence.caseId },
      },
    });

    const stream = await this.storageService.downloadStream(evidence.fileUrl);
    const safeFilename = `${evidence.evidenceNumber}_${evidence.title.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    res.setHeader('Content-Type', evidence.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(safeFilename)}"`,
    );

    stream.pipe(res);
  }

  async update(userId: string, evidenceId: string, dto: UpdateEvidenceDto) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { case: true },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }

    await this.verifyCaseAccess(userId, evidence.caseId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.evidence.update({
        where: { id: evidenceId },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status && { status: dto.status }),
        },
      });

      await tx.custodyEvent.create({
        data: {
          evidenceId,
          performedById: userId,
          eventType: CustodyEventType.ANALYSIS,
          notes: `Evidence metadata/status updated to "${record.status}"`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: evidence.case.organizationId,
          action: 'EVIDENCE_UPDATED',
          resource: 'Evidence',
          resourceId: evidenceId,
          details: { status: record.status, title: record.title },
        },
      });

      return record;
    });

    return {
      message: 'Evidence updated successfully',
      evidence: {
        ...updated,
        fileSizeBytes: Number(updated.fileSizeBytes),
      },
    };
  }

  async archiveOrDelete(userId: string, evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { case: true },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }

    await this.verifyCaseAccess(userId, evidence.caseId);

    const archived = await this.prisma.$transaction(async (tx) => {
      const record = await tx.evidence.update({
        where: { id: evidenceId },
        data: { status: EvidenceStatus.ARCHIVED },
      });

      await tx.custodyEvent.create({
        data: {
          evidenceId,
          performedById: userId,
          eventType: CustodyEventType.DISPOSAL,
          notes: 'Evidence soft-deleted / archived for retention compliance',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: evidence.case.organizationId,
          action: 'EVIDENCE_ARCHIVED',
          resource: 'Evidence',
          resourceId: evidenceId,
        },
      });

      return record;
    });

    return {
      message: 'Evidence archived successfully',
      evidenceId,
      status: archived.status,
    };
  }

  async getCustodyHistory(userId: string, evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }

    await this.verifyCaseAccess(userId, evidence.caseId);

    const custodyEvents = await this.prisma.custodyEvent.findMany({
      where: { evidenceId },
      include: {
        performedBy: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const sanitizedEvents = custodyEvents.map((ce) => ({
      ...ce,
      performedBy: this.usersService.sanitizeUser(ce.performedBy),
    }));

    return {
      message: 'Chain of custody history retrieved successfully',
      evidenceId,
      custodyEvents: sanitizedEvents,
    };
  }

  async verifyIntegrity(userId: string, evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { case: true },
    });

    if (!evidence || !evidence.fileUrl) {
      throw new NotFoundException('Evidence or file storage key not found');
    }

    await this.verifyCaseAccess(userId, evidence.caseId);

    const buffer = await this.storageService.downloadBuffer(evidence.fileUrl);
    const calculatedHash = this.storageService.calculateSha256(buffer);
    const isIntact = calculatedHash.toLowerCase() === evidence.fileHash.toLowerCase();

    await this.prisma.custodyEvent.create({
      data: {
        evidenceId,
        performedById: userId,
        eventType: CustodyEventType.ANALYSIS,
        notes: `SHA-256 hash integrity check performed. Match: ${isIntact ? 'VERIFIED' : 'TAMPERED_OR_CORRUPT'}`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        organizationId: evidence.case.organizationId,
        action: 'EVIDENCE_INTEGRITY_VERIFIED',
        resource: 'Evidence',
        resourceId: evidenceId,
        details: { storedHash: evidence.fileHash, calculatedHash, isIntact },
      },
    });

    return {
      message: isIntact
        ? 'Evidence integrity verified: SHA-256 hashes match perfectly'
        : 'WARNING: Evidence hash mismatch detected!',
      evidenceId,
      storedHash: evidence.fileHash,
      calculatedHash,
      isIntact,
    };
  }
}
