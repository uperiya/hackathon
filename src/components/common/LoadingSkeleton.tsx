import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg mb-3" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-lg">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-4 bg-slate-200 dark:bg-slate-800 rounded flex-1"
                style={{ opacity: 1 - cIdx * 0.1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="h-8 w-20 bg-slate-300 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
  );
};
