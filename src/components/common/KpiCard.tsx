import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlight?: boolean;
  highlightVariant?: 'warning' | 'danger' | 'success';
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-purple-50 text-[#714B67] dark:bg-purple-950/40 dark:text-purple-300',
  trend,
  highlight = false,
  highlightVariant = 'warning',
  onClick,
}) => {
  const highlightStyles = {
    warning: 'border-amber-300/80 dark:border-amber-700/60 ring-1 ring-amber-400/20 bg-amber-50/10',
    danger: 'border-rose-300/80 dark:border-rose-700/60 ring-1 ring-rose-400/20 bg-rose-50/10',
    success: 'border-emerald-300/80 dark:border-emerald-700/60 ring-1 ring-emerald-400/20 bg-emerald-50/10'
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-150 relative overflow-hidden group
        ${onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5' : 'shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]'}
        ${highlight 
          ? highlightStyles[highlightVariant]
          : 'border-slate-200/80 dark:border-slate-800'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {value}
            </span>
            {trend && (
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50'
                    : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`p-3 rounded-xl flex-shrink-0 transition-transform duration-150 group-hover:scale-105 ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
