import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mb-4 shadow-inner">
      {icon || <FolderOpen className="w-7 h-7" />}
    </div>
    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
      {title}
    </h3>
    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-6">
      {description}
    </p>
    {action && <div>{action}</div>}
  </div>
);
