import React from 'react';

export type BadgeStatus = 
  | 'Draft'
  | 'Waiting'
  | 'Ready'
  | 'Done'
  | 'Canceled'
  | 'In Stock'
  | 'Low Stock'
  | 'Out of Stock'
  | 'RECEIPT'
  | 'DELIVERY'
  | 'TRANSFER'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'Admin'
  | 'Inventory Manager'
  | 'Warehouse Staff'
  | 'Active'
  | 'Inactive';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let dotColor = 'bg-slate-400';

  switch (status) {
    // Operation statuses
    case 'Draft':
      colorClasses = 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
      break;
    case 'Waiting':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      dotColor = 'bg-amber-500';
      break;
    case 'Ready':
      colorClasses = 'bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60';
      dotColor = 'bg-sky-500';
      break;
    case 'Done':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      dotColor = 'bg-emerald-500';
      break;
    case 'Canceled':
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      dotColor = 'bg-rose-500';
      break;

    // Inventory Health
    case 'In Stock':
    case 'Active':
      colorClasses = 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      dotColor = 'bg-emerald-500';
      break;
    case 'Low Stock':
      colorClasses = 'bg-amber-50/90 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      dotColor = 'bg-amber-500';
      break;
    case 'Out of Stock':
    case 'Inactive':
      colorClasses = 'bg-rose-50/90 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      dotColor = 'bg-rose-500';
      break;

    // Ledger Operations
    case 'RECEIPT':
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60';
      dotColor = 'bg-[#017E84]';
      break;
    case 'DELIVERY':
      colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
      dotColor = 'bg-indigo-600';
      break;
    case 'TRANSFER':
      colorClasses = 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60';
      dotColor = 'bg-[#714B67]';
      break;
    case 'ADJUSTMENT_IN':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      dotColor = 'bg-emerald-500';
      break;
    case 'ADJUSTMENT_OUT':
      colorClasses = 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60';
      dotColor = 'bg-orange-500';
      break;

    // Roles
    case 'Admin':
      colorClasses = 'bg-purple-50 text-purple-900 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800/60 font-semibold';
      dotColor = 'bg-[#714B67]';
      break;
    case 'Inventory Manager':
      colorClasses = 'bg-blue-50 text-blue-900 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800/60 font-semibold';
      dotColor = 'bg-blue-600';
      break;
    case 'Warehouse Staff':
      colorClasses = 'bg-teal-50 text-teal-900 border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800/60 font-semibold';
      dotColor = 'bg-teal-600';
      break;

    default:
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${sizeClasses} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="truncate">{status}</span>
    </span>
  );
};
