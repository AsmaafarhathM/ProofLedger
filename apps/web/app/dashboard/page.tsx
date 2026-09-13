'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { apiClient } from '@/lib/api-client';
import { Case, Evidence, Organization, ReviewSummary } from '@/lib/types';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Clock,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const orgsData = await apiClient.get<any>('/organizations');
        const orgsList: Organization[] = Array.isArray(orgsData)
          ? orgsData
          : orgsData?.organizations || orgsData?.data || [];
        setOrganizations(orgsList);

        let allCases: Case[] = [];
        let allEvidence: Evidence[] = [];

        for (const org of orgsList) {
          try {
            const casesData = await apiClient.get<any>(
              `/organizations/${org.id}/cases`,
            );
            const cList: Case[] = Array.isArray(casesData)
              ? casesData
              : casesData?.cases || casesData?.data || [];
            allCases = [...allCases, ...cList];

            for (const c of cList.slice(0, 3)) {
              try {
                const evData = await apiClient.get<any>(
                  `/cases/${c.id}/evidence?limit=5`,
                );
                const evItems: Evidence[] = Array.isArray(evData)
                  ? evData
                  : evData?.evidence || evData?.data || [];
                allEvidence = [...allEvidence, ...evItems];
              } catch {}
            }
          } catch {}
        }

        setCases(allCases);
        setEvidenceList(allEvidence);

        let pendingCount = 0;
        for (const ev of allEvidence.slice(0, 5)) {
          try {
            const summary = await apiClient.get<ReviewSummary>(
              `/evidence/${ev.id}/review-summary`,
            );
            pendingCount += summary.pending || 0;
          } catch {}
        }
        setPendingReviewCount(pendingCount);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Evidence Command Center
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Overview of your forensic organizations, active investigation cases, and peer reviews.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/organizations">
              <Button variant="outline" size="sm" leftIcon={<Building2 className="w-4 h-4" />}>
                Manage Orgs
              </Button>
            </Link>
            <Link href="/cases">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                New Case
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Organizations
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-3">
                {isLoading ? '...' : organizations.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Law enforcement & forensic labs</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Active Cases
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-3">
                {isLoading ? '...' : cases.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Investigation workflows</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Evidence Items
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-3">
                {isLoading ? '...' : evidenceList.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Secured S3 file objects</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Pending Reviews
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-3">
                {isLoading ? '...' : pendingReviewCount}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Awaiting peer audit decision</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Investigation Cases</CardTitle>
                <CardDescription>Recent cases assigned to your account</CardDescription>
              </div>
              <Link
                href="/cases"
                className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <EmptyState
                  icon={<Briefcase className="w-6 h-6" />}
                  title="No Active Cases Found"
                  description="Create or join an organization to start creating investigation cases."
                  action={
                    <Link href="/organizations">
                      <Button size="sm">Go to Organizations</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {cases.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 hover:border-emerald-500/40 transition-colors group"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                          {c.title}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 mt-0.5">
                          {c.caseNumber}
                        </span>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Evidence Items</CardTitle>
                <CardDescription>Files secured with SHA-256 integrity proof</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {evidenceList.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="w-6 h-6" />}
                  title="No Evidence Uploaded Yet"
                  description="Select a case and upload digital evidence files to secure them in the vault."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {evidenceList.slice(0, 5).map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/evidence/${ev.id}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 hover:border-emerald-500/40 transition-colors group"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                          {ev.title}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 mt-0.5 truncate">
                          SHA: {ev.fileHash ? ev.fileHash.slice(0, 16) : 'N/A'}...
                        </span>
                      </div>
                      <StatusBadge status={ev.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
