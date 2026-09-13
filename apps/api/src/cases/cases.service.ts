import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseRole, CaseStatus, OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { AddCaseMemberDto } from './dto/add-case-member.dto';
import { QueryCaseDto } from './dto/query-case.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async checkOrgMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of the organization to access its cases',
      );
    }
    return membership;
  }

  async create(userId: string, organizationId: string, dto: CreateCaseDto) {
    await this.checkOrgMembership(userId, organizationId);

    const existingCase = await this.prisma.case.findUnique({
      where: { caseNumber: dto.caseNumber },
    });

    if (existingCase) {
      throw new ConflictException(
        `Case number "${dto.caseNumber}" is already in use`,
      );
    }

    // Atomic transaction: Create Case record and assign creator as LEAD_INVESTIGATOR
    return this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.create({
        data: {
          caseNumber: dto.caseNumber,
          title: dto.title,
          description: dto.description,
          status: dto.status || CaseStatus.ACTIVE,
          organizationId,
          createdById: userId,
        },
      });

      await tx.caseMember.create({
        data: {
          caseId: caseRecord.id,
          userId,
          role: CaseRole.LEAD_INVESTIGATOR,
        },
      });

      return {
        message: 'Case created successfully',
        case: caseRecord,
        userRole: CaseRole.LEAD_INVESTIGATOR,
      };
    });
  }

  async findAllForOrg(
    userId: string,
    organizationId: string,
    query: QueryCaseDto,
  ) {
    const orgMember = await this.checkOrgMembership(userId, organizationId);

    const isOrgAdmin =
      orgMember.role === OrgRole.OWNER || orgMember.role === OrgRole.ADMIN;

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      organizationId,
      ...(query.status && { status: query.status }),
      ...(!isOrgAdmin && {
        members: {
          some: { userId },
        },
      }),
    };

    const [cases, total] = await Promise.all([
      this.prisma.case.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, evidence: true },
          },
        },
      }),
      this.prisma.case.count({ where: whereCondition }),
    ]);

    return {
      message: 'Cases retrieved successfully',
      cases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        organization: true,
        createdBy: true,
        _count: {
          select: { members: true, evidence: true },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    const member = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: { caseId, userId },
      },
    });

    return {
      message: 'Case details retrieved successfully',
      case: {
        ...caseRecord,
        createdBy: this.usersService.sanitizeUser(caseRecord.createdBy),
      },
      userCaseRole: member ? member.role : 'ORG_ADMIN',
    };
  }

  async update(caseId: string, dto: UpdateCaseDto) {
    const updatedCase = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return {
      message: 'Case updated successfully',
      case: updatedCase,
    };
  }

  async remove(caseId: string) {
    await this.prisma.case.delete({
      where: { id: caseId },
    });

    return {
      message: 'Case deleted successfully',
      caseId,
    };
  }

  async addMember(caseId: string, dto: AddCaseMemberDto) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    const targetUser = await this.usersService.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundException('User with specified email not found');
    }

    // Verify target user belongs to parent organization
    const orgMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId: caseRecord.organizationId,
        },
      },
    });

    if (!orgMembership) {
      throw new BadRequestException(
        'Target user must be a member of the organization before joining a case',
      );
    }

    const existingMember = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already assigned to this case');
    }

    const caseMember = await this.prisma.caseMember.create({
      data: {
        caseId,
        userId: targetUser.id,
        role: dto.role || CaseRole.INVESTIGATOR,
      },
      include: {
        user: true,
      },
    });

    return {
      message: 'Member assigned to case successfully',
      member: {
        id: caseMember.id,
        role: caseMember.role,
        assignedAt: caseMember.createdAt,
        user: this.usersService.sanitizeUser(caseMember.user),
      },
    };
  }

  async listMembers(caseId: string) {
    const caseMembers = await this.prisma.caseMember.findMany({
      where: { caseId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = caseMembers.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      assignedAt: m.createdAt,
      user: this.usersService.sanitizeUser(m.user),
    }));

    return {
      message: 'Case members retrieved successfully',
      members,
    };
  }

  async removeMember(
    callerUserId: string,
    caseId: string,
    targetUserId: string,
  ) {
    if (callerUserId === targetUserId) {
      throw new BadRequestException(
        'Case leads or members cannot remove themselves from a case directly',
      );
    }

    const membership = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not assigned to this case');
    }

    await this.prisma.caseMember.delete({
      where: { id: membership.id },
    });

    return {
      message: 'Member removed from case successfully',
      removedUserId: targetUserId,
    };
  }
}
