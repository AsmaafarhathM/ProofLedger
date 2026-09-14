'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { apiClient } from '@/lib/api-client';
import { CaseMember, CustodyEvent, Evidence, Review, ReviewSummary } from '@/lib/types';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Hash,
  Play,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

export default function EvidenceInspectionPage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const { evidenceId } = use(params);

  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [custodyEvents, setCustodyEvents] = useState<CustodyEvent[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [caseMembers, setCaseMembers] = useState<CaseMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Integrity Check State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isIntact: boolean;
    storedHash: string;
    calculatedHash: string;
    message: string;
  } | null>(null);

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);

  // Request Review Modal
  const [isRequestReviewOpen, setIsRequestReviewOpen] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [requestComments, setRequestComments] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Decision Modal State
  const [activeDecisionReview, setActiveDecisionReview] = useState<Review | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [decisionComments, setDecisionComments] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const loadEvidenceData = async () => {
    try {
      const [evRes, custRes, revRes, summaryRes] = await Promise.all([
        apiClient.get<any>(`/evidence/${evidenceId}`),
        apiClient.get<any>(`/evidence/${evidenceId}/custody`),
        apiClient.get<any>(`/evidence/${evidenceId}/reviews`),
        apiClient.get<any>(`/evidence/${evidenceId}/reviews/summary`),
      ]);

      const evItem: Evidence = evRes?.evidence || evRes;
      setEvidence(evItem);
      setCustodyEvents(Array.isArray(custRes) ? custRes : custRes?.history || custRes?.custodyEvents || (evItem as any)?.custodyEvents || []);
      setReviews(Array.isArray(revRes) ? revRes : revRes?.reviews || []);
      setSummary(summaryRes?.summary || summaryRes);

      if (evItem?.caseId) {
        try {
          const membersRes = await apiClient.get<any>(
            `/cases/${evItem.caseId}/members`,
          );
          const mList: CaseMember[] = Array.isArray(membersRes)
            ? membersRes
            : membersRes?.members || membersRes?.data || [];

          const orgId = (evItem as any)?.case?.organizationId;
          if (orgId) {
            try {
              const orgMembersRes = await apiClient.get<any>(
                `/organizations/${orgId}/members`,
              );
              const orgMList = Array.isArray(orgMembersRes)
                ? orgMembersRes
                : orgMembersRes?.members || orgMembersRes?.data || [];

              const existingUserIds = new Set(mList.map((m) => m.userId));
              for (const om of orgMList) {
                if (om.userId && !existingUserIds.has(om.userId)) {
                  mList.push({
                    id: om.id,
                    caseId: evItem.caseId,
                    userId: om.userId,
                    role: (om.role || 'MEMBER') as any,
                    createdAt: new Date().toISOString(),
                    user: om.user,
                  });
                  existingUserIds.add(om.userId);
                }
              }
            } catch {}
          }
          setCaseMembers(mList);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load evidence details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadEvidenceData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-zinc-400 font-medium">
          Loading evidence item details...
        </div>
      </DashboardLayout>
    );
  }

  // Live Integrity Verification
  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await apiClient.post<{
        isIntact: boolean;
        storedHash: string;
        calculatedHash: string;
        message: string;
      }>(`/evidence/${evidenceId}/verify-integrity`);
      setVerificationResult({
        isIntact: res.isIntact,
        storedHash: res.storedHash,
        calculatedHash: res.calculatedHash,
        message: res.message,
      });
      loadEvidenceData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Integrity check failed';
      alert(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Binary Stream Download
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await apiClient.downloadBlob(`/evidence/${evidenceId}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Determine proper file extension instead of forcing .raw
      let filename = '';
      if (evidence) {
        let ext = '';
        if (evidence.fileUrl) {
          const urlPath = evidence.fileUrl.split('?')[0];
          const match = urlPath.match(/\.([a-zA-Z0-9]+)$/);
          if (match && match[1] && match[1].toLowerCase() !== 'raw') {
            ext = match[1].toLowerCase();
          }
        }
        if (!ext && evidence.title) {
          const match = evidence.title.match(/\.([a-zA-Z0-9]+)$/);
          if (match && match[1] && match[1].toLowerCase() !== 'raw') {
            filename = evidence.title;
          }
        }
        if (!ext && evidence.mimeType) {
          const mimeMap: Record<string, string> = {
            'application/pdf': 'pdf',
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'text/plain': 'txt',
            'text/csv': 'csv',
            'application/json': 'json',
            'application/zip': 'zip',
            'video/mp4': 'mp4',
            'audio/mpeg': 'mp3',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
          };
          ext = mimeMap[evidence.mimeType.toLowerCase()] || '';
        }
        if (!filename) {
          const cleanTitle = (evidence.title || evidence.evidenceNumber || 'evidence')
            .replace(/\.raw$/i, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_');
          filename = ext ? `${cleanTitle}.${ext}` : `${cleanTitle}.pdf`;
        }
      } else {
        filename = `evidence_${evidenceId}.bin`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      loadEvidenceData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed';
      alert(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  // Request Review
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    if (!selectedReviewerId) {
      setRequestError('Please select an assigned reviewer');
      return;
    }
    setIsSubmittingRequest(true);
    try {
      await apiClient.post(`/evidence/${evidenceId}/reviews`, {
        reviewerId: selectedReviewerId,
        comments: requestComments,
      });
      setIsRequestReviewOpen(false);
      setSelectedReviewerId('');
      setRequestComments('');
      loadEvidenceData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create review request';
      setRequestError(errorMsg);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Start Review
  const handleStartReview = async (reviewId: string) => {
    try {
      await apiClient.post(`/reviews/${reviewId}/start`);
      loadEvidenceData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start review';
      alert(errorMsg);
    }
  };

  // Submit Decision
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setDecisionError(null);
    if (decisionType === 'REJECTED' && !decisionComments.trim()) {
      setDecisionError('Comments are required when rejecting evidence');
      return;
    }
    if (!activeDecisionReview) return;

    setIsSubmittingDecision(true);
    try {
      await apiClient.post(`/reviews/${activeDecisionReview.id}/decision`, {
        decision: decisionType,
        comments: decisionComments,
      });
      setActiveDecisionReview(null);
      setDecisionComments('');
      loadEvidenceData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit review decision';
      setDecisionError(errorMsg);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Cancel Review
  const handleCancelReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to cancel this review request?')) return;
    try {
      await apiClient.post(`/reviews/${reviewId}/cancel`, {
        reason: 'Cancelled by case lead',
      });
      loadEvidenceData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel review';
      alert(errorMsg);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Navigation Back */}
        <div className="flex items-center gap-3">
          {evidence?.caseId && (
            <Link
              href={`/cases/${evidence.caseId}`}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Case
            </Link>
          )}
        </div>

        {/* Title Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xl border border-purple-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {evidence?.title || 'Evidence Inspection'}
                </h1>
                {evidence?.status && <StatusBadge status={evidence.status} />}
              </div>
              <p className="text-xs font-mono text-purple-400 mt-1">
                {evidence?.evidenceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyIntegrity}
              isLoading={isVerifying}
              leftIcon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
            >
              Verify Integrity
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              isLoading={isDownloading}
              disabled={!evidence?.fileUrl}
              leftIcon={<Download className="w-4 h-4" />}
              title={
                !evidence?.fileUrl
                  ? 'No physical file stored for this evidence record'
                  : 'Download binary stream from S3'
              }
            >
              {!evidence?.fileUrl ? 'No File Stored' : 'Download Stream'}
            </Button>
          </div>
        </div>

        {/* Cryptographic Verification Result Banner */}
        {verificationResult && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in fade-in ${
              verificationResult.isIntact
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {verificationResult.isIntact ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-sm">
                  {verificationResult.isIntact
                    ? 'CRYPTOGRAPHIC SHA-256 INTEGRITY VERIFIED'
                    : 'INTEGRITY MISMATCH DETECTED'}
                </span>
                <span className="text-xs font-mono opacity-80">
                  Calculated: {verificationResult.calculatedHash}
                </span>
              </div>
            </div>
            <StatusBadge
              status={verificationResult.isIntact ? 'APPROVED' : 'REJECTED'}
            />
          </div>
        )}

        {/* Metadata & Review Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Metadata Card */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle>Evidence Metadata & SHA-256 Digest</CardTitle>
                <CardDescription>
                  Immutable evidence record stored in private object storage
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* SHA-256 Hash Card */}
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> SHA-256 Cryptographic Hash
                    </span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(evidence?.fileHash || '')
                      }
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <span className="text-xs font-mono text-zinc-100 break-all select-all">
                    {evidence?.fileHash}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 uppercase tracking-wider">
                      File Size
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {evidence?.fileSizeBytes
                        ? `${(Number(evidence.fileSizeBytes) / 1024).toFixed(1)} KB`
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 uppercase tracking-wider">
                      MIME Type
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {evidence?.mimeType || 'binary/octet-stream'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 uppercase tracking-wider">
                      Uploaded On
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {evidence?.createdAt
                        ? new Date(evidence.createdAt).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {evidence?.description && (
                  <div className="flex flex-col gap-1 text-xs border-t border-zinc-800/60 pt-3 mt-1">
                    <span className="text-zinc-500 uppercase tracking-wider">
                      Description & Notes
                    </span>
                    <p className="text-zinc-300 leading-relaxed">
                      {evidence.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peer Reviews Section */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Peer Forensic Reviews ({reviews.length})</CardTitle>
                  <CardDescription>
                    Reviewer assignments and decision verification trail
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRequestReviewOpen(true)}
                  leftIcon={<UserCheck className="w-4 h-4" />}
                >
                  Request Review
                </Button>
              </CardHeader>

              <CardContent>
                {/* Summary Metrics */}
                {summary && (
                  <div className="grid grid-cols-4 gap-3 mb-6 p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center text-xs">
                    <div>
                      <span className="text-zinc-500 block">Pending</span>
                      <span className="font-bold text-amber-400 text-base">
                        {summary.pending}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">In Review</span>
                      <span className="font-bold text-blue-400 text-base">
                        {summary.inReview}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Approved</span>
                      <span className="font-bold text-emerald-400 text-base">
                        {summary.approved}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Rejected</span>
                      <span className="font-bold text-rose-400 text-base">
                        {summary.rejected}
                      </span>
                    </div>
                  </div>
                )}

                {reviews.length === 0 ? (
                  <EmptyState
                    icon={<UserCheck className="w-6 h-6" />}
                    title="No Peer Reviews Requested"
                    description="Request a supervisor or peer reviewer to audit this evidence item."
                    action={
                      <Button
                        size="sm"
                        onClick={() => setIsRequestReviewOpen(true)}
                      >
                        Request Review
                      </Button>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                            <span>
                              Reviewer: {rev.reviewer?.firstName} {rev.reviewer?.lastName}
                            </span>
                            <span className="text-zinc-500">({rev.reviewer?.email})</span>
                          </div>
                          <StatusBadge status={rev.status} />
                        </div>

                        {rev.comments && (
                          <p className="text-xs text-zinc-400 italic bg-zinc-900/60 p-2.5 rounded-lg">
                            &quot;{rev.comments}&quot;
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                          <span>
                            Requested {new Date(rev.createdAt).toLocaleDateString()}
                          </span>

                          <div className="flex items-center gap-2">
                            {rev.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartReview(rev.id)}
                                  leftIcon={<Play className="w-3 h-3" />}
                                >
                                  Start Review
                                </Button>
                                <button
                                  onClick={() => handleCancelReview(rev.id)}
                                  className="text-xs text-zinc-400 hover:text-rose-400"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {(rev.status === 'IN_REVIEW' || rev.status === 'IN_PROGRESS') && (
                              <Button
                                size="sm"
                                onClick={() => setActiveDecisionReview(rev)}
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                Submit Decision
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chain of Custody Timeline Sidebar */}
          <div className="flex flex-col gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle>Chain of Custody Timeline ({custodyEvents.length})</CardTitle>
                <CardDescription>
                  Immutable event log tracking evidence lifecycle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l border-zinc-800 flex flex-col gap-6">
                  {custodyEvents.map((ev) => (
                    <div key={ev.id} className="relative flex flex-col gap-1 text-xs">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />

                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-400">
                          {ev.eventType}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(ev.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-zinc-300 leading-relaxed text-[11px] font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 break-all select-all">
                        {ev.notes}
                      </p>
                      <span className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(ev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Request Review Modal */}
        <Modal
          isOpen={isRequestReviewOpen}
          onClose={() => setIsRequestReviewOpen(false)}
          title="Request Peer Review"
          description="Assign a case member to review and verify this evidence item."
        >
          <form onSubmit={handleCreateReview} className="flex flex-col gap-4">
            {requestError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {requestError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Assigned Reviewer
              </label>
              <select
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">Select a case reviewer...</option>
                {caseMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Review Instructions / Comments (Optional)"
              placeholder="e.g. Please check SHA-256 header and verify log timestamp integrity"
              value={requestComments}
              onChange={(e) => setRequestComments(e.target.value)}
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsRequestReviewOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmittingRequest}>
                Send Review Request
              </Button>
            </div>
          </form>
        </Modal>

        {/* Submit Review Decision Modal */}
        <Modal
          isOpen={!!activeDecisionReview}
          onClose={() => setActiveDecisionReview(null)}
          title="Submit Review Decision"
          description="Record your peer audit approval or rejection decision for this evidence."
        >
          <form onSubmit={handleSubmitDecision} className="flex flex-col gap-4">
            {decisionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {decisionError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Decision
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDecisionType('APPROVED')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition-colors ${
                    decisionType === 'APPROVED'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Evidence
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionType('REJECTED')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition-colors ${
                    decisionType === 'REJECTED'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Reject Evidence
                </button>
              </div>
            </div>

            <Input
              label={
                decisionType === 'REJECTED'
                  ? 'Rejection Reason (Required)'
                  : 'Decision Comments (Optional)'
              }
              placeholder={
                decisionType === 'REJECTED'
                  ? 'Explain why the evidence is rejected...'
                  : 'Verified cryptographic SHA-256 digest integrity'
              }
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
              required={decisionType === 'REJECTED'}
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveDecisionReview(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={decisionType === 'APPROVED' ? 'primary' : 'danger'}
                isLoading={isSubmittingDecision}
              >
                Submit {decisionType}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
