import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaseRole, OrgRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CASE_ROLES_KEY } from '../decorators/case-roles.decorator';

@Injectable()
export class CaseAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication required');
    }

    const caseId = request.params.caseId || request.params.id;
    if (!caseId) {
      return true;
    }

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        organization: true,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    // Attach case entity to request context for downstream handlers
    request.caseRecord = caseRecord;

    // Check parent Organization membership and role
    const orgMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
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

    // Check Case Membership
    const caseMembership = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId,
          userId: user.id,
        },
      },
    });

    if (!caseMembership && !isOrgAdmin) {
      throw new ForbiddenException(
        'You are not assigned as a member of this case',
      );
    }

    request.caseMember = caseMembership;

    const requiredRoles = this.reflector.getAllAndOverride<CaseRole[]>(
      CASE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Org Owners/Admins override case-level role restrictions
    if (isOrgAdmin) {
      return true;
    }

    if (!caseMembership || !requiredRoles.includes(caseMembership.role)) {
      throw new ForbiddenException(
        `Action requires one of the following case roles: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
