import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrgRole } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;
  let usersService: UsersService;

  const mockUserOwner = {
    id: 'owner-uuid-1',
    email: 'owner@proofledger.org',
    firstName: 'Owner',
    lastName: 'User',
  };

  const mockUserMember = {
    id: 'member-uuid-2',
    email: 'member@proofledger.org',
    firstName: 'Member',
    lastName: 'User',
  };

  const mockOrg = {
    id: 'org-uuid-100',
    name: 'Forensics Lab',
    slug: 'forensics-lab',
    description: 'Digital forensics evidence team',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
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
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization and assign creator as OWNER', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockOrg);
      mockPrismaService.organizationMember.create.mockResolvedValue({
        id: 'mem-1',
        userId: mockUserOwner.id,
        organizationId: mockOrg.id,
        role: OrgRole.OWNER,
      });

      const dto = {
        name: 'Forensics Lab',
        slug: 'forensics-lab',
        description: 'Digital forensics evidence team',
      };

      const result = await service.create(mockUserOwner.id, dto);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'forensics-lab' },
      });
      expect(result.organization.slug).toBe('forensics-lab');
      expect(result.userRole).toBe(OrgRole.OWNER);
    });

    it('should throw ConflictException if organization slug is taken', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const dto = {
        name: 'Forensics Lab',
        slug: 'forensics-lab',
      };

      await expect(service.create(mockUserOwner.id, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a new member to an organization', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUserMember);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.create.mockResolvedValue({
        id: 'mem-2',
        userId: mockUserMember.id,
        organizationId: mockOrg.id,
        role: OrgRole.MEMBER,
        createdAt: new Date(),
        user: mockUserMember,
      });

      const dto = { email: 'member@proofledger.org', role: OrgRole.MEMBER };
      const result = await service.addMember(mockOrg.id, dto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(result.member.role).toBe(OrgRole.MEMBER);
    });

    it('should throw NotFoundException if user email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const dto = { email: 'unknown@proofledger.org' };
      await expect(service.addMember(mockOrg.id, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if user is already a member', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUserMember);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-2',
      });

      const dto = { email: 'member@proofledger.org' };
      await expect(service.addMember(mockOrg.id, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeMember', () => {
    it('should prevent an owner/caller from removing themselves', async () => {
      await expect(
        service.removeMember(mockUserOwner.id, mockOrg.id, mockUserOwner.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully remove a target member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        id: 'mem-2',
        userId: mockUserMember.id,
        organizationId: mockOrg.id,
      });
      mockPrismaService.organizationMember.delete.mockResolvedValue({});

      const result = await service.removeMember(
        mockUserOwner.id,
        mockOrg.id,
        mockUserMember.id,
      );

      expect(result.removedUserId).toBe(mockUserMember.id);
      expect(prisma.organizationMember.delete).toHaveBeenCalledWith({
        where: { id: 'mem-2' },
      });
    });
  });
});
