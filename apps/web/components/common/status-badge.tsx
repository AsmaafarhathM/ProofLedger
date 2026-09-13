import React from 'react';

type StatusType =
  | 'ACTIVE'
  | 'DRAFT'
  | 'SUSPENDED'
  | 'CLOSED'
  | 'ARCHIVED'
  | 'COLLECTED'
  | 'ANALYZING'
  | 'IN_CUSTODY'
  | 'TRANSFERRED'
  | 'SUBMITTED_TO_COURT'
  | 'DISPOSED'
  | 'PENDING'
  | 'IN_REVIEW'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const styles: Record<string, string> = {
    // Case / Org Statuses
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    DRAFT: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    CLOSED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    ARCHIVED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',

    // Evidence Statuses
    COLLECTED: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    ANALYZING: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    IN_CUSTODY: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    TRANSFERRED: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    SUBMITTED_TO_COURT: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    DISPOSED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',

    // Review Statuses
    PENDING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse',
    IN_REVIEW: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    APPROVED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    REJECTED: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    CANCELLED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  };

  const defaultStyle =
    'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
  const badgeStyle = styles[status] || defaultStyle;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-md uppercase tracking-wider ${badgeStyle} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
