import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CaseRole, CustodyEventType, OrgRole, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewDecisionType } from './dto/review-decision.dto';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  const mockEvidenceId = 'evidence-uuid-1';
  const mockCaseId = 'case-uuid-1';
  const mockOrgId = 'org-uuid-1';
  const mockUserId = 'user-uuid-1';
  const mockUploaderId = 'uploader-uuid-1';
  const mockReviewerId = 'reviewer-uuid-1';
  const mockReviewId = 'review-uuid-1';

  const mockEvidence = {
    id: mockEvidenceId,
    evidenceNumber: 'EVD-2026-001',
    title: 'Forensic Disk Dump',
    createdById: mockUploaderId,
    caseId: mockCaseId,
    case: {
      id: mockCaseId,
      organizationId: mockOrgId,
      createdById: mockUserId,
    },
  };

  const mockPrismaService: any = {
    evidence: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    caseMember: {
      findUnique: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    custodyEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    it('1. should successfully create a review request', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: OrgRole.MEMBER }) // Requester
        .mockResolvedValueOnce({ role: OrgRole.MEMBER }); // Reviewer
      prisma.caseMember.findUnique
        .mockResolvedValueOnce({ role: CaseRole.INVESTIGATOR }) // Requester
        .mockResolvedValueOnce({ role: CaseRole.REVIEWER }); // Reviewer
      prisma.user.findUnique.mockResolvedValue({ id: mockReviewerId });
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({
        id: mockReviewId,
        evidenceId: mockEvidenceId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.PENDING,
        createdAt: new Date(),
      });

      const result = await service.createReview(mockEvidenceId, mockUserId, {
        reviewerId: mockReviewerId,
        comments: 'Verify disk image',
      });

      expect(result.message).toBe('Review request created successfully');
      expect(result.review.id).toBe(mockReviewId);
      expect(prisma.custodyEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: CustodyEventType.REVIEW_REQUESTED,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('2. should throw NotFoundException for invalid evidence ID', async () => {
      prisma.evidence.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview('invalid-evidence-id', mockUserId, {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('3. should throw ForbiddenException for unauthorized requester', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      prisma.caseMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview(mockEvidenceId, 'unauthorized-user', {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. should throw ForbiddenException if reviewer is from another organization', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: OrgRole.MEMBER }) // Requester
        .mockResolvedValueOnce(null); // Reviewer not in org
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.INVESTIGATOR });
      prisma.user.findUnique.mockResolvedValue({ id: mockReviewerId });

      await expect(
        service.createReview(mockEvidenceId, mockUserId, {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow('Assigned reviewer must belong to the same organization');
    });

    it('5. should throw ForbiddenException if reviewer does not belong to case', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: OrgRole.MEMBER })
        .mockResolvedValueOnce({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique
        .mockResolvedValueOnce({ role: CaseRole.INVESTIGATOR }) // Requester
        .mockResolvedValueOnce(null); // Reviewer not in case
      prisma.user.findUnique.mockResolvedValue({ id: mockReviewerId });

      await expect(
        service.createReview(mockEvidenceId, mockUserId, {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow('Assigned reviewer must be a member of the case');
    });

    it('6. should throw ForbiddenException if reviewer has VIEWER role only', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: OrgRole.MEMBER })
        .mockResolvedValueOnce({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique
        .mockResolvedValueOnce({ role: CaseRole.INVESTIGATOR })
        .mockResolvedValueOnce({ role: CaseRole.VIEWER }); // Reviewer is viewer only
      prisma.user.findUnique.mockResolvedValue({ id: mockReviewerId });

      await expect(
        service.createReview(mockEvidenceId, mockUserId, {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('7. should throw ConflictException on duplicate active review', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: OrgRole.MEMBER })
        .mockResolvedValueOnce({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique
        .mockResolvedValueOnce({ role: CaseRole.INVESTIGATOR })
        .mockResolvedValueOnce({ role: CaseRole.REVIEWER });
      prisma.user.findUnique.mockResolvedValue({ id: mockReviewerId });
      prisma.review.findFirst.mockResolvedValue({ id: 'existing-review-id' });

      await expect(
        service.createReview(mockEvidenceId, mockUserId, {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('8. should enforce separation of duties (uploader cannot review own evidence)', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence); // createdById: mockUploaderId
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.INVESTIGATOR });

      await expect(
        service.createReview(mockEvidenceId, mockUserId, {
          reviewerId: mockUploaderId, // assigned reviewer is uploader!
        }),
      ).rejects.toThrow('Separation of duties policy');
    });
  });

  describe('listEvidenceReviews & getReview', () => {
    it('9. should successfully list reviews for evidence', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.INVESTIGATOR });
      prisma.review.count.mockResolvedValue(1);
      prisma.review.findMany.mockResolvedValue([
        { id: mockReviewId, status: ReviewStatus.PENDING },
      ]);

      const result = await service.listEvidenceReviews(mockEvidenceId, mockUserId, {});
      expect(result.reviews).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('10. should throw ForbiddenException for unauthorized review listing', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      prisma.caseMember.findUnique.mockResolvedValue(null);

      await expect(
        service.listEvidenceReviews(mockEvidenceId, 'unauthorized-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('startReview', () => {
    it('11. should throw ForbiddenException if user is not the assigned reviewer', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.PENDING,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });

      await expect(
        service.startReview(mockReviewId, 'other-user-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('12. should reject invalid status transition when not PENDING', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.APPROVED, // Already approved
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });

      await expect(
        service.startReview(mockReviewId, mockReviewerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('13. should successfully start a PENDING review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.PENDING,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.review.update.mockResolvedValue({
        id: mockReviewId,
        status: ReviewStatus.IN_REVIEW,
      });

      const result = await service.startReview(mockReviewId, mockReviewerId);
      expect(result.review.status).toBe(ReviewStatus.IN_REVIEW);
      expect(prisma.custodyEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: CustodyEventType.REVIEW_STARTED,
          }),
        }),
      );
    });
  });

  describe('submitDecision', () => {
    it('14. should successfully approve evidence', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.IN_REVIEW,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.review.update.mockResolvedValue({
        id: mockReviewId,
        status: ReviewStatus.APPROVED,
        decision: ReviewDecisionType.APPROVED,
      });

      const result = await service.submitDecision(mockReviewId, mockReviewerId, {
        decision: ReviewDecisionType.APPROVED,
        comments: 'Looks good',
      });

      expect(result.review.status).toBe(ReviewStatus.APPROVED);
      expect(prisma.custodyEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: CustodyEventType.REVIEW_DECISION,
          }),
        }),
      );
    });

    it('15. should successfully reject evidence with comments', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.IN_REVIEW,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.review.update.mockResolvedValue({
        id: mockReviewId,
        status: ReviewStatus.REJECTED,
        decision: ReviewDecisionType.REJECTED,
      });

      const result = await service.submitDecision(mockReviewId, mockReviewerId, {
        decision: ReviewDecisionType.REJECTED,
        comments: 'Corrupted hash in section 2',
      });

      expect(result.review.status).toBe(ReviewStatus.REJECTED);
    });

    it('16. should throw BadRequestException if rejecting without comments', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.IN_REVIEW,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });

      await expect(
        service.submitDecision(mockReviewId, mockReviewerId, {
          decision: ReviewDecisionType.REJECTED,
          comments: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('17. should throw ForbiddenException for unauthorized decision submitter', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.IN_REVIEW,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });

      await expect(
        service.submitDecision(mockReviewId, 'random-user', {
          decision: ReviewDecisionType.APPROVED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('18. should throw BadRequestException on decision for completed review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.APPROVED, // Already completed
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });

      await expect(
        service.submitDecision(mockReviewId, mockReviewerId, {
          decision: ReviewDecisionType.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelReview & Audit Log / Summary / Transactions', () => {
    it('19. should successfully cancel an active review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.PENDING,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.OWNER });
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.LEAD_INVESTIGATOR });
      prisma.review.update.mockResolvedValue({
        id: mockReviewId,
        status: ReviewStatus.CANCELLED,
      });

      const result = await service.cancelReview(mockReviewId, mockUserId, {
        reason: 'Case closed',
      });

      expect(result.review.status).toBe(ReviewStatus.CANCELLED);
    });

    it('20. should throw ForbiddenException if non-lead attempts cancellation', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.PENDING,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.INVESTIGATOR });

      await expect(
        service.cancelReview(mockReviewId, 'non-lead-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('21 & 22. should verify custody event and audit log creation on decision', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: mockReviewId,
        evidenceId: mockEvidenceId,
        reviewerId: mockReviewerId,
        status: ReviewStatus.IN_REVIEW,
        evidence: mockEvidence,
      });
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.review.update.mockResolvedValue({ id: mockReviewId, status: ReviewStatus.APPROVED });

      await service.submitDecision(mockReviewId, mockReviewerId, {
        decision: ReviewDecisionType.APPROVED,
        comments: 'Verified',
      });

      expect(prisma.custodyEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evidenceId: mockEvidenceId,
            eventType: CustodyEventType.REVIEW_DECISION,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'EVIDENCE_REVIEW_DECISION',
          }),
        }),
      );
    });

    it('23. should correctly compute review summary stats', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.INVESTIGATOR });
      prisma.review.findMany.mockResolvedValue([
        { status: ReviewStatus.APPROVED, decision: 'APPROVED', reviewedAt: new Date() },
        { status: ReviewStatus.REJECTED, decision: 'REJECTED', reviewedAt: new Date() },
        { status: ReviewStatus.PENDING, decision: null, reviewedAt: null },
      ]);

      const summary = await service.getReviewSummary(mockEvidenceId, mockUserId);
      expect(summary.totalReviews).toBe(3);
      expect(summary.approved).toBe(1);
      expect(summary.rejected).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.latestDecision).toBe('APPROVED');
    });

    it('24. should throw ForbiddenException when accessing cross-organization review', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      prisma.caseMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getReviewSummary(mockEvidenceId, 'cross-org-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('25. should rollback transaction if audit log or custody creation fails', async () => {
      prisma.evidence.findUnique.mockResolvedValue(mockEvidence);
      prisma.organizationMember.findUnique.mockResolvedValue({ role: OrgRole.MEMBER });
      prisma.caseMember.findUnique.mockResolvedValue({ role: CaseRole.INVESTIGATOR });
      prisma.user.findUnique.mockResolvedValue({ id: mockReviewerId });
      prisma.review.findFirst.mockResolvedValue(null);

      prisma.$transaction.mockImplementationOnce(async (txCallback: any) => {
        const txPrisma = {
          ...mockPrismaService,
          custodyEvent: {
            create: jest.fn().mockRejectedValue(new Error('Transaction failure')),
          },
        };
        return txCallback(txPrisma);
      });

      await expect(
        service.createReview(mockEvidenceId, mockUserId, {
          reviewerId: mockReviewerId,
        }),
      ).rejects.toThrow('Transaction failure');
    });
  });
});
