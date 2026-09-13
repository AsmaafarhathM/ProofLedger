import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseRole, CustodyEventType, OrgRole, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CancelReviewDto } from './dto/cancel-review.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { ReviewDecisionDto, ReviewDecisionType } from './dto/review-decision.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user is Org Admin or Owner
   */
  private async isOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
    return (
      !!membership &&
      (membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN)
    );
  }

  /**
   * Check user case membership
   */
  private async getCaseMembership(userId: string, caseId: string) {
    return this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId,
          userId,
        },
      },
    });
  }

  /**
   * Verify requester has case access or org admin privileges
   */
  private async verifyEvidenceAccess(evidenceId: string, userId: string) {
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

    const isAdmin = await this.isOrgAdmin(userId, evidence.case.organizationId);
    const caseMembership = await this.getCaseMembership(userId, evidence.caseId);

    if (!isAdmin && !caseMembership) {
      throw new ForbiddenException(
        'You do not have access to the case associated with this evidence',
      );
    }

    return { evidence, isAdmin, caseMembership };
  }

  /**
   * 1. Create a Review Request
   * POST /evidence/:evidenceId/reviews
   */
  async createReview(evidenceId: string, userId: string, dto: CreateReviewDto) {
    const { evidence, isAdmin, caseMembership } = await this.verifyEvidenceAccess(
      evidenceId,
      userId,
    );

    // 1. Separation of duties check: Uploaders cannot review their own evidence
    if (dto.reviewerId === evidence.createdById) {
      throw new ForbiddenException(
        'Separation of duties policy: Evidence uploader cannot review their own uploaded evidence',
      );
    }

    // 2. Validate reviewer existence & org membership
    const reviewerUser = await this.prisma.user.findUnique({
      where: { id: dto.reviewerId },
    });
    if (!reviewerUser) {
      throw new NotFoundException('Assigned reviewer user not found');
    }

    const reviewerOrgMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.reviewerId,
          organizationId: evidence.case.organizationId,
        },
      },
    });

    if (!reviewerOrgMembership) {
      throw new ForbiddenException(
        'Assigned reviewer must belong to the same organization',
      );
    }

    // 3. Validate reviewer case membership and case role
    const reviewerCaseMembership = await this.prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId: evidence.caseId,
          userId: dto.reviewerId,
        },
      },
    });

    if (!reviewerCaseMembership) {
      throw new ForbiddenException(
        'Assigned reviewer must be a member of the case',
      );
    }

    if (reviewerCaseMembership.role === CaseRole.VIEWER) {
      throw new ForbiddenException(
        'Assigned reviewer must have a reviewer or authorized investigator role',
      );
    }

    // 4. Prevent duplicate active reviews for the same evidence and reviewer
    const activeReview = await this.prisma.review.findFirst({
      where: {
        evidenceId,
        reviewerId: dto.reviewerId,
        status: {
          in: [ReviewStatus.PENDING, ReviewStatus.IN_REVIEW, ReviewStatus.IN_PROGRESS],
        },
      },
    });

    if (activeReview) {
      throw new ConflictException(
        'An active review request already exists for this evidence and reviewer',
      );
    }

    // 5. Create Review, CustodyEvent, and AuditLog in database transaction
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          evidenceId,
          reviewerId: dto.reviewerId,
          status: ReviewStatus.PENDING,
          comments: dto.comments,
        },
      });

      await tx.custodyEvent.create({
        data: {
          evidenceId,
          performedById: userId,
          eventType: CustodyEventType.REVIEW_REQUESTED,
          notes: `Peer forensic review requested for reviewer ${dto.reviewerId}. ${dto.comments || ''}`.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: evidence.case.organizationId,
          action: 'EVIDENCE_REVIEW_REQUESTED',
          resource: 'Review',
          resourceId: review.id,
          details: {
            evidenceId,
            reviewerId: dto.reviewerId,
            status: ReviewStatus.PENDING,
          },
        },
      });

      return {
        message: 'Review request created successfully',
        review: {
          id: review.id,
          evidenceId: review.evidenceId,
          reviewerId: review.reviewerId,
          status: review.status,
          createdAt: review.createdAt,
        },
      };
    });
  }

  /**
   * 2. List Reviews for Evidence
   * GET /evidence/:evidenceId/reviews
   */
  async listEvidenceReviews(evidenceId: string, userId: string, query: QueryReviewDto) {
    await this.verifyEvidenceAccess(evidenceId, userId);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      evidenceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.reviewerId ? { reviewerId: query.reviewerId } : {}),
    };

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: whereClause }),
      this.prisma.review.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
        include: {
          reviewer: {
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
      message: 'Evidence reviews retrieved successfully',
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3. Get Single Review Details
   * GET /reviews/:reviewId
   */
  async getReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        evidence: {
          include: {
            case: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review record not found');
    }

    const isAdmin = await this.isOrgAdmin(userId, review.evidence.case.organizationId);
    const caseMembership = await this.getCaseMembership(userId, review.evidence.caseId);

    if (!isAdmin && !caseMembership) {
      throw new ForbiddenException(
        'You do not have access to the case associated with this review',
      );
    }

    return {
      message: 'Review details retrieved successfully',
      review,
    };
  }

  /**
   * 4. Start a Review
   * POST /reviews/:reviewId/start
   */
  async startReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        evidence: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review record not found');
    }

    const isAdmin = await this.isOrgAdmin(userId, review.evidence.case.organizationId);

    // Authorization: Only assigned reviewer or Org Admin can start the review
    if (review.reviewerId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned reviewer or organization administrator can start this review',
      );
    }

    // Separation of duties policy: Uploaders cannot start a review on their own uploaded evidence
    if (review.evidence.createdById === userId) {
      throw new ForbiddenException(
        'Separation of duties policy: Evidence uploader cannot start a review on their own evidence',
      );
    }

    // Status transition rule: Only PENDING reviews can be started
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException(
        `Invalid status transition: Only PENDING reviews can be started. Current status: ${review.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: ReviewStatus.IN_REVIEW,
        },
      });

      await tx.custodyEvent.create({
        data: {
          evidenceId: review.evidenceId,
          performedById: userId,
          eventType: CustodyEventType.REVIEW_STARTED,
          notes: `Reviewer initiated evidence verification for review ${reviewId}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: review.evidence.case.organizationId,
          action: 'EVIDENCE_REVIEW_STARTED',
          resource: 'Review',
          resourceId: review.id,
          details: {
            previousStatus: ReviewStatus.PENDING,
            newStatus: ReviewStatus.IN_REVIEW,
          },
        },
      });

      return {
        message: 'Review started successfully',
        review: updatedReview,
      };
    });
  }

  /**
   * 5. Approve or Reject Evidence
   * POST /reviews/:reviewId/decision
   */
  async submitDecision(reviewId: string, userId: string, dto: ReviewDecisionDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        evidence: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review record not found');
    }

    const isAdmin = await this.isOrgAdmin(userId, review.evidence.case.organizationId);

    // Authorization: Only assigned reviewer or Org Admin can submit a decision
    if (review.reviewerId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned reviewer or organization administrator can submit a review decision',
      );
    }

    // Separation of duties policy: Uploaders cannot submit a decision on their own uploaded evidence
    if (review.evidence.createdById === userId) {
      throw new ForbiddenException(
        'Separation of duties policy: Evidence uploader cannot submit a decision on their own evidence',
      );
    }

    // Status transition rule: Only IN_REVIEW or IN_PROGRESS reviews can receive a decision
    if (
      review.status !== ReviewStatus.IN_REVIEW &&
      review.status !== ReviewStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        `Cannot submit decision on a review that is not IN_REVIEW. Current status: ${review.status}`,
      );
    }

    // Validation: Rejection requires comments
    if (
      dto.decision === ReviewDecisionType.REJECTED &&
      (!dto.comments || dto.comments.trim().length === 0)
    ) {
      throw new BadRequestException(
        'Comments are required when rejecting evidence',
      );
    }

    const targetStatus =
      dto.decision === ReviewDecisionType.APPROVED
        ? ReviewStatus.APPROVED
        : ReviewStatus.REJECTED;

    return this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: targetStatus,
          decision: dto.decision,
          comments: dto.comments || review.comments,
          reviewedAt: new Date(),
        },
      });

      await tx.custodyEvent.create({
        data: {
          evidenceId: review.evidenceId,
          performedById: userId,
          eventType: CustodyEventType.REVIEW_DECISION,
          notes: `Review decision: ${dto.decision}. Comments: ${dto.comments || 'N/A'}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: review.evidence.case.organizationId,
          action: 'EVIDENCE_REVIEW_DECISION',
          resource: 'Review',
          resourceId: review.id,
          details: {
            decision: dto.decision,
            comments: dto.comments,
            status: targetStatus,
          },
        },
      });

      return {
        message: 'Review decision recorded successfully',
        review: updatedReview,
      };
    });
  }

  /**
   * 6. Cancel a Review
   * POST /reviews/:reviewId/cancel
   */
  async cancelReview(reviewId: string, userId: string, dto: CancelReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        evidence: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review record not found');
    }

    const isAdmin = await this.isOrgAdmin(userId, review.evidence.case.organizationId);
    const caseMembership = await this.getCaseMembership(userId, review.evidence.caseId);
    const isCaseLead =
      caseMembership && caseMembership.role === CaseRole.LEAD_INVESTIGATOR;

    // Authorization: Only case lead, case creator, or org admin can cancel a review
    if (!isAdmin && !isCaseLead && review.evidence.case.createdById !== userId) {
      throw new ForbiddenException(
        'Only authorized case leads or organization administrators can cancel a review',
      );
    }

    // Status rule: Completed reviews (APPROVED, REJECTED, CANCELLED) cannot be cancelled
    if (
      review.status === ReviewStatus.APPROVED ||
      review.status === ReviewStatus.REJECTED ||
      review.status === ReviewStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel a completed review. Current status: ${review.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: ReviewStatus.CANCELLED,
          comments: dto.reason
            ? `Cancelled: ${dto.reason}`
            : review.comments,
        },
      });

      await tx.custodyEvent.create({
        data: {
          evidenceId: review.evidenceId,
          performedById: userId,
          eventType: CustodyEventType.REVIEW_CANCELLED,
          notes: `Review cancelled. Reason: ${dto.reason || 'No reason provided'}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          organizationId: review.evidence.case.organizationId,
          action: 'EVIDENCE_REVIEW_CANCELLED',
          resource: 'Review',
          resourceId: review.id,
          details: {
            reason: dto.reason,
            previousStatus: review.status,
          },
        },
      });

      return {
        message: 'Review cancelled successfully',
        review: updatedReview,
      };
    });
  }

  /**
   * 7. Get Evidence Review Summary
   * GET /evidence/:evidenceId/review-summary
   */
  async getReviewSummary(evidenceId: string, userId: string) {
    await this.verifyEvidenceAccess(evidenceId, userId);

    const reviews = await this.prisma.review.findMany({
      where: { evidenceId },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const pending = reviews.filter((r) => r.status === ReviewStatus.PENDING).length;
    const inReview = reviews.filter(
      (r) => r.status === ReviewStatus.IN_REVIEW || r.status === ReviewStatus.IN_PROGRESS,
    ).length;
    const approved = reviews.filter((r) => r.status === ReviewStatus.APPROVED).length;
    const rejected = reviews.filter((r) => r.status === ReviewStatus.REJECTED).length;
    const cancelled = reviews.filter((r) => r.status === ReviewStatus.CANCELLED).length;

    const latestCompletedReview = reviews.find(
      (r) => r.reviewedAt !== null || r.decision !== null,
    );

    return {
      evidenceId,
      totalReviews,
      pending,
      inReview,
      approved,
      rejected,
      cancelled,
      latestDecision: latestCompletedReview ? latestCompletedReview.decision : null,
      latestReviewedAt: latestCompletedReview
        ? latestCompletedReview.reviewedAt
        : null,
    };
  }
}
