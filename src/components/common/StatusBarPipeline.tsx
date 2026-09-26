import React from 'react';
import { OperationStatus } from '../../types';
import { Check, X } from 'lucide-react';

interface StatusBarPipelineProps {
  currentStatus: OperationStatus;
  stages?: OperationStatus[];
}

const DEFAULT_STAGES: OperationStatus[] = ['Draft', 'Waiting', 'Ready', 'Done'];

export const StatusBarPipeline: React.FC<StatusBarPipelineProps> = ({
  currentStatus,
  stages = DEFAULT_STAGES,
}) => {
  if (currentStatus === 'Canceled') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
        <X className="w-3.5 h-3.5" />
        <span>Canceled</span>
      </div>
    );
  }

  const currentIndex = stages.indexOf(currentStatus);

  return (
    <div className="inline-flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-100/70 dark:bg-slate-900 p-0.5 shadow-sm text-xs font-semibold">
      {stages.map((stage, idx) => {
        const isCurrent = stage === currentStatus;
        const isPast = currentIndex !== -1 && idx < currentIndex;

        return (
          <div
            key={stage}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-all
              ${isCurrent
                ? 'bg-[#714B67] text-white rounded-md shadow-sm'
                : isPast
                ? 'text-slate-600 dark:text-slate-400 font-medium'
                : 'text-slate-400 dark:text-slate-600 font-normal'
              }`}
          >
            {isPast ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : isCurrent ? (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            ) : null}
            <span>{stage}</span>
          </div>
        );
      })}
    </div>
  );
};
