export type GlobalRole = 'SUPER_ADMIN' | 'USER';
export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
export type CaseRole = 'LEAD_INVESTIGATOR' | 'INVESTIGATOR' | 'REVIEWER' | 'VIEWER';
export type CaseStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';
export type EvidenceStatus =
  | 'COLLECTED'
  | 'ANALYZING'
  | 'IN_CUSTODY'
  | 'TRANSFERRED'
  | 'SUBMITTED_TO_COURT'
  | 'DISPOSED'
  | 'ARCHIVED';

export type CustodyEventType =
  | 'COLLECTION'
  | 'TRANSFER'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'ANALYSIS'
  | 'COURT_PRESENTATION'
  | 'DISPOSAL'
  | 'REVIEW_REQUESTED'
  | 'REVIEW_STARTED'
  | 'REVIEW_DECISION'
  | 'REVIEW_CANCELLED';

export type ReviewStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: GlobalRole;
  isActive: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  members?: OrganizationMember[];
  userRole?: OrgRole;
  _count?: {
    members?: number;
    cases?: number;
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  createdAt: string;
  user?: User;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  status: CaseStatus;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  members?: CaseMember[];
  evidence?: Evidence[];
  userRole?: CaseRole;
  _count?: {
    evidence?: number;
    members?: number;
  };
}

export interface CaseMember {
  id: string;
  caseId: string;
  userId: string;
  role: CaseRole;
  createdAt: string;
  user?: User;
}

export interface Evidence {
  id: string;
  evidenceNumber: string;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileHash: string;
  fileSizeBytes?: number | string | null;
  mimeType?: string | null;
  status: EvidenceStatus;
  caseId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  case?: Case;
}

export interface CustodyEvent {
  id: string;
  evidenceId: string;
  performedById: string;
  eventType: CustodyEventType;
  location?: string | null;
  notes?: string | null;
  digitalSignature?: string | null;
  createdAt: string;
  performedBy?: User;
}

export interface Review {
  id: string;
  evidenceId: string;
  reviewerId: string;
  status: ReviewStatus;
  decision?: 'APPROVED' | 'REJECTED' | null;
  comments?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer?: User;
  evidence?: Evidence;
}

export interface ReviewSummary {
  evidenceId: string;
  totalReviews: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  cancelled: number;
  latestDecision?: string | null;
  latestReviewedAt?: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: User | null;
}
