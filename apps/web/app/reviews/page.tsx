'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { apiClient } from '@/lib/api-client';
import { Case, Evidence, Organization, Review } from '@/lib/types';
import {
  ArrowRight,
  CheckSquare,
  Play,
  UserCheck,
} from 'lucide-react';

export default function ReviewsInboxPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      // Fetch organizations
      const orgsData = await apiClient.get<any>('/organizations');
      const orgsList: Organization[] = Array.isArray(orgsData)
        ? orgsData
        : orgsData?.organizations || orgsData?.data || [];

      let allReviews: Review[] = [];

      for (const org of orgsList) {
        try {
          const casesData = await apiClient.get<any>(`/organizations/${org.id}/cases`);
          const cList: Case[] = Array.isArray(casesData) ? casesData : casesData?.cases || casesData?.data || [];

          for (const c of cList) {
            try {
              const evData = await apiClient.get<any>(`/cases/${c.id}/evidence?limit=10`);
              const evItems: Evidence[] = Array.isArray(evData) ? evData : evData?.evidence || evData?.data || [];

              for (const ev of evItems) {
                try {
                  const rData = await apiClient.get<any>(`/evidence/${ev.id}/reviews`);
                  const rList: Review[] = Array.isArray(rData) ? rData : rData?.reviews || rData?.data || [];

                  // Attach evidence object to review if missing
                  const enriched = rList.map((r) => ({
                    ...r,
                    evidence: r.evidence || ev,
                  }));
                  allReviews = [...allReviews, ...enriched];
                } catch {}
              }
            } catch {}
          }
        } catch {}
      }

      setReviews(allReviews);
    } catch (err) {
      console.error('Failed to load peer reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchReviews();
    })();
  }, []);

  const handleStartReview = async (reviewId: string) => {
    try {
      await apiClient.post(`/reviews/${reviewId}/start`);
      fetchReviews();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start review';
      alert(errorMsg);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Peer Review Inbox
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Audit assigned digital evidence items and record approval decisions.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/60">
          {['ALL', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
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

        {/* Review List */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-zinc-900/40 animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-8 h-8" />}
            title="No Reviews Found"
            description={
              filterStatus === 'ALL'
                ? 'You have no assigned peer reviews at this time.'
                : `No reviews matching status "${filterStatus}".`
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {filteredReviews.map((rev) => (
              <Card
                key={rev.id}
                className="bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/30 transition-colors"
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 mt-0.5">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-zinc-100 text-base">
                          {rev.evidence?.title || 'Evidence Review'}
                        </span>
                        <StatusBadge status={rev.status} />
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Reviewer: {rev.reviewer?.firstName} {rev.reviewer?.lastName} ({rev.reviewer?.email})
                      </p>
                      {rev.comments && (
                        <p className="text-xs text-zinc-300 italic mt-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                          &quot;{rev.comments}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 border-zinc-800/60 pt-3 md:pt-0 w-full md:w-auto justify-end">
                    {rev.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartReview(rev.id)}
                        leftIcon={<Play className="w-3.5 h-3.5" />}
                      >
                        Start Review
                      </Button>
                    )}

                    {rev.evidence?.id && (
                      <Link href={`/evidence/${rev.evidence.id}`}>
                        <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                          Inspect Evidence
                        </Button>
                      </Link>
                    )}
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
