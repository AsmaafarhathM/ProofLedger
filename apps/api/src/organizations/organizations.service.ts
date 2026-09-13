import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });
    if (existingOrg) {
      throw new ConflictException('Organization slug is already in use');
    }

    // Atomic transaction: Create organization and assign creator as OWNER
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug.toLowerCase(),
          description: dto.description,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: organization.id,
          role: OrgRole.OWNER,
        },
      });

      return {
        message: 'Organization created successfully',
        organization,
        userRole: OrgRole.OWNER,
      };
    });
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return {
      message: 'Organizations retrieved successfully',
      organizations,
    };
  }

  async findOne(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { members: true, cases: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      message: 'Organization details retrieved successfully',
      organization,
    };
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return {
      message: 'Organization updated successfully',
      organization,
    };
  }

  async addMember(organizationId: string, dto: AddMemberDto) {
    const targetUser = await this.usersService.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundException('User with specified email not found');
    }

    const existingMembership =
      await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUser.id,
            organizationId,
          },
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const memberRole = dto.role || OrgRole.MEMBER;

    const membership = await this.prisma.organizationMember.create({
      data: {
        userId: targetUser.id,
        organizationId,
        role: memberRole,
      },
      include: {
        user: true,
      },
    });

    return {
      message: 'Member added to organization successfully',
      member: {
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        user: this.usersService.sanitizeUser(membership.user),
      },
    };
  }

  async listMembers(organizationId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.createdAt,
      user: this.usersService.sanitizeUser(m.user),
    }));

    return {
      message: 'Organization members retrieved successfully',
      members,
    };
  }

  async removeMember(
    callerUserId: string,
    organizationId: string,
    targetUserId: string,
  ) {
    if (callerUserId === targetUserId) {
      throw new BadRequestException(
        'An organization owner or member cannot remove themselves directly',
      );
    }

    const targetMembership =
      await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId,
          },
        },
      });

    if (!targetMembership) {
      throw new NotFoundException(
        'Member not found in this organization',
      );
    }

    await this.prisma.organizationMember.delete({
      where: {
        id: targetMembership.id,
      },
    });

    return {
      message: 'Member removed from organization successfully',
      removedUserId: targetUserId,
    };
  }

  async getAuditLogs(
    organizationId: string,
    query: import('./dto/query-audit-log.dto').QueryAuditLogDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where: whereClause }),
      this.prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      message: 'Audit logs retrieved successfully',
      auditLogs: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
