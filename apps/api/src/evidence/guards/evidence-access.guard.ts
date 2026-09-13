import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EvidenceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication required');
    }

    const evidenceId = request.params.evidenceId || request.params.id;
    if (!evidenceId) {
      return true;
    }

    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        case: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }

    request.evidenceRecord = evidence;

    // Check Organization membership
    const orgMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: evidence.case.organizationId,
        },
      },
    });

    if (!orgMembership) {
      throw new ForbiddenException(
        'You do not belong to the organization governing this evidence',
      );
    }

    const isOrgAdmin =
      orgMembership.role === OrgRole.OWNER ||
      orgMembership.role === OrgRole.ADMIN;

    // Check Case membership
    const caseMembership = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId: evidence.caseId,
          userId: user.id,
        },
      },
    });

    if (!caseMembership && !isOrgAdmin) {
      throw new ForbiddenException(
        'You do not have access to the case associated with this evidence',
      );
    }

    request.caseMembership = caseMembership;
    return true;
  }
}
