'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/common/empty-state';
import { apiClient } from '@/lib/api-client';
import { AuditLog, Organization } from '@/lib/types';
import {
  Activity,
  Building2,
  Code,
  FileText,
  Filter,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

export default function AuditLogsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeLogDetails, setActiveLogDetails] = useState<AuditLog | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/organizations');
      const list = Array.isArray(data) ? data : data?.organizations || data?.data || [];
      setOrganizations(list);
      if (list.length > 0 && !selectedOrgId) {
        setSelectedOrgId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  }, [selectedOrgId]);

  const fetchAuditLogs = async (orgId: string) => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.get<{ auditLogs?: AuditLog[] }>(
        `/organizations/${orgId}/audit-logs?limit=50`,
      );
      setAuditLogs(Array.isArray(data) ? data : data.auditLogs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchOrganizations();
    })();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      void (async () => {
        await fetchAuditLogs(selectedOrgId);
      })();
    }
  }, [selectedOrgId]);

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter === 'ALL') return true;
    return log.action.toUpperCase().includes(actionFilter.toUpperCase());
  });

  const getActionColor = (action: string) => {
    if (action.includes('EVIDENCE')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (action.includes('REVIEW')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (action.includes('CASE')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Header & Org Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> Compliance & Audit Trail
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Security Audit Logs
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Tamper-evident, immutable activity trail across organization evidence and case operations.
            </p>
          </div>

          {/* Org Selector */}
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-zinc-900 text-zinc-100 border border-zinc-800 text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-500/50"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/60">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0 mr-1" />
          {['ALL', 'EVIDENCE', 'REVIEW', 'CASE'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActionFilter(filter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                actionFilter === filter
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Audit Log Table / Timeline */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-zinc-900/40 animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No Audit Logs Found"
            description={
              selectedOrgId
                ? 'No audit log events recorded for this organization filter.'
                : 'Select an organization to inspect activity logs.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredLogs.map((log) => (
              <Card
                key={log.id}
                className="bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/30 transition-colors"
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg border ${getActionColor(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs font-semibold text-zinc-300">
                          Resource: {log.resource} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                          {log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System Actor'}
                        </span>
                        <span>•</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {log.details && (
                    <button
                      onClick={() => setActiveLogDetails(log)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium border border-zinc-700/60 flex items-center gap-1.5 shrink-0 self-end md:self-center transition-colors"
                    >
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      Inspect Payload
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Details Payload Inspector Modal */}
        {activeLogDetails && (
          <Modal
            isOpen={!!activeLogDetails}
            onClose={() => setActiveLogDetails(null)}
            title={`Audit Event Metadata: ${activeLogDetails.action}`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-xs text-zinc-400">
                <span>Event ID: <code className="text-zinc-200">{activeLogDetails.id}</code></span>
                <span>Timestamp: <span className="text-zinc-200">{new Date(activeLogDetails.createdAt).toLocaleString()}</span></span>
                <span>Resource: <span className="text-zinc-200">{activeLogDetails.resource} ({activeLogDetails.resourceId})</span></span>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Contextual JSON Payload:
                </label>
                <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(activeLogDetails.details, null, 2)}
                </pre>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
