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
export class ReviewAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication required');
    }

    const reviewId = request.params.reviewId;
    if (reviewId) {
      const review = await this.prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          evidence: {
            include: {
              case: true,
            },
          },
          reviewer: true,
        },
      });

      if (!review) {
        throw new NotFoundException('Review record not found');
      }

      request.reviewRecord = review;

      const orgMembership = await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: review.evidence.case.organizationId,
          },
        },
      });

      if (!orgMembership) {
        throw new ForbiddenException(
          'You do not belong to the organization governing this review',
        );
      }

      const isOrgAdmin =
        orgMembership.role === OrgRole.OWNER ||
        orgMembership.role === OrgRole.ADMIN;

      const caseMembership = await this.prisma.caseMember.findUnique({
        where: {
          caseId_userId: {
            caseId: review.evidence.caseId,
            userId: user.id,
          },
        },
      });

      if (!caseMembership && !isOrgAdmin) {
        throw new ForbiddenException(
          'You do not have access to the case associated with this review',
        );
      }

      request.caseMembership = caseMembership;
      request.orgMembership = orgMembership;
      return true;
    }

    return true;
  }
}
