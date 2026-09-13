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
import { Case, Organization, OrganizationMember, OrgRole } from '@/lib/types';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Mail,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);

  const [org, setOrg] = useState<Organization | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<OrgRole>('MEMBER');
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Create Case Modal State
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [caseNumber, setCaseNumber] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [createCaseError, setCreateCaseError] = useState<string | null>(null);
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  const loadOrgDetails = async () => {
    try {
      const [orgRes, casesRes, membersRes] = await Promise.all([
        apiClient.get<Organization>(`/organizations/${organizationId}`),
        apiClient.get<{ cases?: Case[] }>(`/organizations/${organizationId}/cases`),
        apiClient.get<{ members?: OrganizationMember[] }>(`/organizations/${organizationId}/members`),
      ]);

      setOrg(orgRes);
      setCases(Array.isArray(casesRes) ? casesRes : casesRes.cases || []);
      setMembers(Array.isArray(membersRes) ? membersRes : membersRes.members || []);
    } catch (err) {
      console.error('Failed to load organization details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadOrgDetails();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError(null);
    if (!memberEmail.trim()) {
      setAddMemberError('Email address is required');
      return;
    }
    setIsAddingMember(true);
    try {
      await apiClient.post(`/organizations/${organizationId}/members`, {
        email: memberEmail,
        role: memberRole,
      });
      setIsAddMemberOpen(false);
      setMemberEmail('');
      loadOrgDetails();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add member';
      setAddMemberError(errorMsg);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
      loadOrgDetails();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove member';
      alert(errorMsg);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCaseError(null);
    if (!caseNumber.trim() || !caseTitle.trim()) {
      setCreateCaseError('Case number and title are required');
      return;
    }
    setIsCreatingCase(true);
    try {
      await apiClient.post(`/organizations/${organizationId}/cases`, {
        caseNumber,
        title: caseTitle,
        description: caseDescription,
      });
      setIsCreateCaseOpen(false);
      setCaseNumber('');
      setCaseTitle('');
      setCaseDescription('');
      loadOrgDetails();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create case';
      setCreateCaseError(errorMsg);
    } finally {
      setIsCreatingCase(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-zinc-400 font-medium">
          Loading organization details...
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
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-500/20">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {org?.name || 'Organization Details'}
              </h1>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Slug: {org?.slug}
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
            <Button
              size="sm"
              onClick={() => {
                setCaseNumber(`CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`);
                setIsCreateCaseOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Case
            </Button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cases List */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Investigation Cases ({cases.length})</CardTitle>
                  <CardDescription>
                    Active and archived cases under {org?.name}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <EmptyState
                    icon={<Briefcase className="w-6 h-6" />}
                    title="No Cases Created"
                    description="Start a new investigation case to store evidence and assign investigators."
                    action={
                      <Button
                        size="sm"
                        onClick={() => {
                          setCaseNumber(`CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`);
                          setIsCreateCaseOpen(true);
                        }}
                      >
                        Create Case
                      </Button>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {cases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 hover:border-emerald-500/40 transition-colors group"
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                            {c.title}
                          </span>
                          <span className="text-xs font-mono text-zinc-400 mt-1">
                            {c.caseNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={c.status} />
                          <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Members Sidebar */}
          <div className="flex flex-col gap-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Organization Members ({members.length})</CardTitle>
                  <CardDescription>Investigators and admins</CardDescription>
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
          title="Add Organization Member"
          description="Grant access to an investigator by entering their registered email."
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
              placeholder="investigator@agency.gov"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Organization Role
              </label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as OrgRole)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="MEMBER">MEMBER (Standard Access)</option>
                <option value="ADMIN">ADMIN (Case & Member Management)</option>
                <option value="OWNER">OWNER (Full Control)</option>
                <option value="GUEST">GUEST (Read-Only)</option>
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
                Add Member
              </Button>
            </div>
          </form>
        </Modal>

        {/* Create Case Modal */}
        <Modal
          isOpen={isCreateCaseOpen}
          onClose={() => setIsCreateCaseOpen(false)}
          title="Create Investigation Case"
          description="Setup a case to associate digital evidence files and assign reviewers."
        >
          <form onSubmit={handleCreateCase} className="flex flex-col gap-4">
            {createCaseError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {createCaseError}
              </div>
            )}

            <Input
              label="Case Number"
              placeholder="e.g. CASE-2026-101"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              required
            />

            <Input
              label="Case Title"
              placeholder="e.g. Cyber Breach - Server Intrusion"
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              required
            />

            <Input
              label="Description (Optional)"
              placeholder="Summary of investigation objectives"
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateCaseOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isCreatingCase}>
                Create Case
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
