import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CustodyEventType, EvidenceStatus, OrgRole } from '@prisma/client';
import { EvidenceService } from './evidence.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';

describe('EvidenceService', () => {
  let service: EvidenceService;
  let prisma: PrismaService;
  let storageService: StorageService;
  let usersService: UsersService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'investigator@proofledger.org',
    firstName: 'Alex',
    lastName: 'Vance',
  };

  const mockOrgId = 'org-uuid-1';
  const mockCaseId = 'case-uuid-1';
  const mockEvidenceId = 'evidence-uuid-1';

  const mockCaseRecord = {
    id: mockCaseId,
    caseNumber: 'CASE-2026-001',
    organizationId: mockOrgId,
  };

  const mockEvidenceRecord = {
    id: mockEvidenceId,
    evidenceNumber: 'EVD-2026-001',
    title: 'Hard Drive Forensic Image',
    description: 'Bit-stream image of suspect drive',
    fileUrl: `${mockCaseId}/12345-drive.img`,
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    fileSizeBytes: BigInt(1024),
    mimeType: 'application/octet-stream',
    status: EvidenceStatus.COLLECTED,
    caseId: mockCaseId,
    createdById: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'drive.img',
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    buffer: Buffer.from('ProofLedger Sample Evidence File Data'),
    size: 37,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockPrismaService = {
    case: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    caseMember: {
      findUnique: jest.fn(),
    },
    evidence: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    custodyEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
  };

  const mockStorageService = {
    calculateSha256: jest
      .fn()
      .mockReturnValue('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    uploadFile: jest.fn().mockResolvedValue({ key: 'mock-key', size: 37 }),
    downloadBuffer: jest.fn().mockResolvedValue(Buffer.from('ProofLedger Sample Evidence File Data')),
    downloadStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    fileExists: jest.fn().mockResolvedValue(true),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    sanitizeUser: jest.fn().mockImplementation((u) => u),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
    prisma = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadEvidence', () => {
    it('should upload evidence and record initial CustodyEvent + AuditLog', async () => {
      mockPrismaService.case.findUnique.mockResolvedValue(mockCaseRecord);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrgRole.OWNER,
      });
      mockPrismaService.caseMember.findUnique.mockResolvedValue({ id: 'cm-1' });
      mockPrismaService.evidence.findUnique.mockResolvedValue(null);
      mockPrismaService.evidence.create.mockResolvedValue(mockEvidenceRecord);

      const dto = {
        evidenceNumber: 'EVD-2026-001',
        title: 'Hard Drive Forensic Image',
        description: 'Bit-stream image of suspect drive',
      };

      const result = await service.uploadEvidence(
        mockUser.id,
        mockCaseId,
        mockMulterFile,
        dto,
      );

      expect(storageService.calculateSha256).toHaveBeenCalled();
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(prisma.evidence.create).toHaveBeenCalled();
      expect(prisma.custodyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: CustodyEventType.COLLECTION,
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EVIDENCE_UPLOADED',
        }),
      });
      expect(result.evidence.evidenceNumber).toBe('EVD-2026-001');
    });

    it('should throw BadRequestException if uploaded file is empty', async () => {
      const emptyFile = { ...mockMulterFile, buffer: Buffer.from('') };

      await expect(
        service.uploadEvidence(mockUser.id, mockCaseId, emptyFile, {
          evidenceNumber: 'EVD-1',
          title: 'Empty',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file MIME type is unsupported', async () => {
      const invalidMimeFile = { ...mockMulterFile, mimetype: 'application/x-msdownload' };

      await expect(
        service.uploadEvidence(mockUser.id, mockCaseId, invalidMimeFile, {
          evidenceNumber: 'EVD-1',
          title: 'Exe',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cleanup storage file if database transaction fails', async () => {
      mockPrismaService.case.findUnique.mockResolvedValue(mockCaseRecord);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrgRole.OWNER,
      });
      mockPrismaService.evidence.findUnique.mockResolvedValue(null);
      mockPrismaService.evidence.create.mockRejectedValue(
        new Error('Database Constraint Violation'),
      );

      const dto = { evidenceNumber: 'EVD-2026-001', title: 'Test' };

      await expect(
        service.uploadEvidence(mockUser.id, mockCaseId, mockMulterFile, dto),
      ).rejects.toThrow('Database Constraint Violation');

      expect(storageService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify SHA-256 hash integrity successfully when hashes match', async () => {
      mockPrismaService.evidence.findUnique.mockResolvedValue({
        ...mockEvidenceRecord,
        case: { organizationId: mockOrgId },
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrgRole.OWNER,
      });

      mockStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from('ProofLedger Sample Evidence File Data'),
      );
      mockStorageService.calculateSha256.mockReturnValue(
        mockEvidenceRecord.fileHash,
      );

      const result = await service.verifyIntegrity(mockUser.id, mockEvidenceId);

      expect(result.isIntact).toBe(true);
      expect(prisma.custodyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: CustodyEventType.ANALYSIS,
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EVIDENCE_INTEGRITY_VERIFIED',
        }),
      });
    });

    it('should flag hash mismatch if calculated hash differs from stored hash', async () => {
      mockPrismaService.evidence.findUnique.mockResolvedValue({
        ...mockEvidenceRecord,
        case: { organizationId: mockOrgId },
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrgRole.OWNER,
      });

      mockStorageService.calculateSha256.mockReturnValue('TAMPERED_HASH_123456');

      const result = await service.verifyIntegrity(mockUser.id, mockEvidenceId);

      expect(result.isIntact).toBe(false);
    });
  });

  describe('getCustodyHistory', () => {
    it('should return chain of custody events for evidence', async () => {
      mockPrismaService.evidence.findUnique.mockResolvedValue({
        ...mockEvidenceRecord,
        case: { organizationId: mockOrgId },
      });
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrgRole.OWNER,
      });
      mockPrismaService.custodyEvent.findMany.mockResolvedValue([
        {
          id: 'ce-1',
          evidenceId: mockEvidenceId,
          eventType: CustodyEventType.COLLECTION,
          performedBy: mockUser,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getCustodyHistory(mockUser.id, mockEvidenceId);

      expect(result.custodyEvents).toHaveLength(1);
      expect(result.custodyEvents[0].eventType).toBe(CustodyEventType.COLLECTION);
    });
  });
});
