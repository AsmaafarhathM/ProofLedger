import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CaseRole, CaseStatus, OrgRole } from '@prisma/client';
import { CasesService } from './cases.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('CasesService', () => {
  let service: CasesService;
  let prisma: PrismaService;
  let usersService: UsersService;

  const mockUserLead = {
    id: 'user-lead-1',
    email: 'lead@proofledger.org',
    firstName: 'Lead',
    lastName: 'Investigator',
  };

  const mockUserInvestigator = {
    id: 'user-inv-2',
    email: 'investigator@proofledger.org',
    firstName: 'Second',
    lastName: 'Investigator',
  };

  const mockOrgId = 'org-uuid-999';

  const mockCase = {
    id: 'case-uuid-101',
    caseNumber: 'CASE-2026-001',
    title: 'Financial Cyber Fraud Investigation',
    description: 'Investigating unauthorized wire transfers',
    status: CaseStatus.ACTIVE,
    organizationId: mockOrgId,
    createdById: mockUserLead.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    organizationMember: {
      findUnique: jest.fn(),
    },
    case: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    caseMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    sanitizeUser: jest.fn().mockImplementation((u) => u),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a case and assign creator as LEAD_INVESTIGATOR', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'org-mem-1',
        role: OrgRole.MEMBER,
      });
      mockPrismaService.case.findUnique.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);
      mockPrismaService.caseMember.create.mockResolvedValue({
        id: 'case-mem-1',
        caseId: mockCase.id,
        userId: mockUserLead.id,
        role: CaseRole.LEAD_INVESTIGATOR,
      });

      const dto = {
        caseNumber: 'CASE-2026-001',
        title: 'Financial Cyber Fraud Investigation',
        description: 'Investigating unauthorized wire transfers',
      };

      const result = await service.create(mockUserLead.id, mockOrgId, dto);

      expect(prisma.organizationMember.findUnique).toHaveBeenCalled();
      expect(result.case.caseNumber).toBe('CASE-2026-001');
      expect(result.userRole).toBe(CaseRole.LEAD_INVESTIGATOR);
    });

    it('should throw ForbiddenException if user is not an organization member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      const dto = {
        caseNumber: 'CASE-2026-001',
        title: 'Unauthorized Case',
      };

      await expect(
        service.create(mockUserLead.id, mockOrgId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if case number is duplicate', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'org-mem-1',
      });
      mockPrismaService.case.findUnique.mockResolvedValue(mockCase);

      const dto = {
        caseNumber: 'CASE-2026-001',
        title: 'Financial Cyber Fraud Investigation',
      };

      await expect(
        service.create(mockUserLead.id, mockOrgId, dto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllForOrg', () => {
    it('should list paginated cases with status filter', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        role: OrgRole.OWNER,
      });
      mockPrismaService.case.findMany.mockResolvedValue([mockCase]);
      mockPrismaService.case.count.mockResolvedValue(1);

      const query = { status: CaseStatus.ACTIVE, page: 1, limit: 10 };
      const result = await service.findAllForOrg(
        mockUserLead.id,
        mockOrgId,
        query,
      );

      expect(result.cases).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('addMember', () => {
    it('should add an investigator to a case', async () => {
      mockPrismaService.case.findUnique.mockResolvedValue(mockCase);
      mockUsersService.findByEmail.mockResolvedValue(mockUserInvestigator);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'org-mem-2',
      });
      mockPrismaService.caseMember.findUnique.mockResolvedValue(null);
      mockPrismaService.caseMember.create.mockResolvedValue({
        id: 'case-mem-2',
        role: CaseRole.INVESTIGATOR,
        createdAt: new Date(),
        user: mockUserInvestigator,
      });

      const dto = {
        email: 'investigator@proofledger.org',
        role: CaseRole.INVESTIGATOR,
      };

      const result = await service.addMember(mockCase.id, dto);

      expect(result.member.role).toBe(CaseRole.INVESTIGATOR);
    });

    it('should throw BadRequestException if target user does not belong to parent org', async () => {
      mockPrismaService.case.findUnique.mockResolvedValue(mockCase);
      mockUsersService.findByEmail.mockResolvedValue(mockUserInvestigator);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      const dto = { email: 'investigator@proofledger.org' };

      await expect(service.addMember(mockCase.id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeMember', () => {
    it('should prevent case lead from removing themselves directly', async () => {
      await expect(
        service.removeMember(mockUserLead.id, mockCase.id, mockUserLead.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove a case member successfully', async () => {
      mockPrismaService.caseMember.findUnique.mockResolvedValue({
        id: 'case-mem-2',
        userId: mockUserInvestigator.id,
      });
      mockPrismaService.caseMember.delete.mockResolvedValue({});

      const result = await service.removeMember(
        mockUserLead.id,
        mockCase.id,
        mockUserInvestigator.id,
      );

      expect(result.removedUserId).toBe(mockUserInvestigator.id);
    });
  });
});
