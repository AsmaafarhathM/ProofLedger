'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { apiClient } from '@/lib/api-client';
import { Case, Organization } from '@/lib/types';
import { ArrowRight, Briefcase, Plus } from 'lucide-react';

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const orgsData = await apiClient.get<any>('/organizations');
      const orgsList: Organization[] = Array.isArray(orgsData)
        ? orgsData
        : orgsData?.organizations || orgsData?.data || [];
      setOrganizations(orgsList);

      let allCases: Case[] = [];
      for (const org of orgsList) {
        try {
          const casesData = await apiClient.get<any>(`/organizations/${org.id}/cases`);
          const cList: Case[] = Array.isArray(casesData) ? casesData : (casesData?.cases || casesData?.data || []);
          allCases = [...allCases, ...cList];
        } catch {}
      }
      setCases(allCases);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchCases();
    })();
  }, []);

  const filteredCases = cases.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Investigation Cases
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Browse and manage digital evidence investigation cases.
            </p>
          </div>
          {organizations.length > 0 && (
            <Link href={`/organizations/${organizations[0].id}`}>
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Create New Case
              </Button>
            </Link>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/60">
          {['ALL', 'ACTIVE', 'DRAFT', 'SUSPENDED', 'CLOSED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterStatus === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Cases Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-zinc-900/40 animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-8 h-8" />}
            title="No Cases Found"
            description={
              filterStatus === 'ALL'
                ? 'Create a case within an organization to start managing digital evidence.'
                : `No cases matching status "${filterStatus}".`
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((c) => (
              <Card
                key={c.id}
                className="bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-emerald-400 font-semibold">
                      {c.caseNumber}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <CardTitle className="line-clamp-1">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {c.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60 pt-4 mt-2">
                    <span className="text-[11px] text-zinc-500">
                      Created {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/cases/${c.id}`}
                      className="text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      Open Case <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
