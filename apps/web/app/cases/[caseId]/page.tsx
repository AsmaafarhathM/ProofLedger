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
import { Case, CaseMember, CaseRole, Evidence } from '@/lib/types';
import {
  ArrowRight,
  Briefcase,
  FileCheck,
  Mail,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);

  const [caseObj, setCaseObj] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [members, setMembers] = useState<CaseMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<CaseRole>('INVESTIGATOR');
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const loadCaseDetails = async () => {
    try {
      const [caseRes, evidenceRes, membersRes] = await Promise.all([
        apiClient.get<Case>(`/cases/${caseId}`),
        apiClient.get<{ evidence?: Evidence[] }>(`/cases/${caseId}/evidence?limit=50`),
        apiClient.get<{ members?: CaseMember[] }>(`/cases/${caseId}/members`),
      ]);

      setCaseObj(caseRes);
      setEvidenceList(Array.isArray(evidenceRes) ? evidenceRes : evidenceRes.evidence || []);
      setMembers(Array.isArray(membersRes) ? membersRes : membersRes.members || []);
    } catch (err) {
      console.error('Failed to load case details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadCaseDetails();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError(null);
    if (!memberEmail.trim()) {
      setAddMemberError('Email address is required');
      return;
    }
    setIsAddingMember(true);
    try {
      await apiClient.post(`/cases/${caseId}/members`, {
        email: memberEmail,
        role: memberRole,
      });
      setIsAddMemberOpen(false);
      setMemberEmail('');
      loadCaseDetails();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add case member';
      setAddMemberError(errorMsg);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this investigator from the case?')) return;
    try {
      await apiClient.delete(`/cases/${caseId}/members/${userId}`);
      loadCaseDetails();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove member';
      alert(errorMsg);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-zinc-400 font-medium">
          Loading case details...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-500/20">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {caseObj?.title || 'Case Details'}
                </h1>
                {caseObj?.status && <StatusBadge status={caseObj.status} />}
              </div>
              <p className="text-xs font-mono text-emerald-400 mt-1">
                {caseObj?.caseNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddMemberOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add Member
            </Button>
            <Link href={`/cases/${caseId}/evidence/upload`}>
              <Button size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                Upload Evidence
              </Button>
            </Link>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Evidence Grid */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Evidence Vault ({evidenceList.length})</CardTitle>
                  <CardDescription>
                    Digital evidence files secured with SHA-256 integrity hashes
                  </CardDescription>
                </div>
                <Link href={`/cases/${caseId}/evidence/upload`}>
                  <Button size="sm" variant="outline" leftIcon={<Upload className="w-3.5 h-3.5" />}>
                    Upload File
                  </Button>
                </Link>
              </CardHeader>

              <CardContent>
                {evidenceList.length === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck className="w-6 h-6" />}
                    title="No Evidence Uploaded"
                    description="Upload disk dumps, server access logs, or forensic artifacts to secure them."
                    action={
                      <Link href={`/cases/${caseId}/evidence/upload`}>
                        <Button size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                          Upload Evidence
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {evidenceList.map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/evidence/${ev.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 hover:border-emerald-500/40 transition-colors group gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                              {ev.title}
                            </span>
                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-0.5">
                              <span>{ev.evidenceNumber}</span>
                              <span>•</span>
                              <span className="truncate">
                                SHA: {ev.fileHash ? ev.fileHash.slice(0, 16) : ''}...
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0">
                          <StatusBadge status={ev.status} />
                          <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Case Members Sidebar */}
          <div className="flex flex-col gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Case Members ({members.length})</CardTitle>
                  <CardDescription>Assigned investigators & reviewers</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-zinc-200 truncate">
                          {m.user?.firstName} {m.user?.lastName}
                        </span>
                        <span className="text-[11px] text-zinc-400 truncate">
                          {m.user?.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={m.role} />
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Member Modal */}
        <Modal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          title="Add Case Member"
          description="Assign an investigator or peer reviewer to this case."
        >
          <form onSubmit={handleAddMember} className="flex flex-col gap-4">
            {addMemberError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {addMemberError}
              </div>
            )}

            <Input
              label="Member Email"
              type="email"
              placeholder="reviewer@agency.gov"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Case Role
              </label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as CaseRole)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="INVESTIGATOR">INVESTIGATOR (Standard Access)</option>
                <option value="REVIEWER">REVIEWER (Peer Reviewer)</option>
                <option value="LEAD_INVESTIGATOR">LEAD INVESTIGATOR (Case Control)</option>
                <option value="VIEWER">VIEWER (Read-Only)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddMemberOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isAddingMember}>
                Assign Member
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
