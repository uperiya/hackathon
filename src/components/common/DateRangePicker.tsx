import React from 'react';
import { Calendar } from 'lucide-react';

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  range,
  onChange,
  className = '',
}) => {
  const setPreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      onChange({ startDate: '', endDate: '' });
      return;
    }

    if (preset === 'today') {
      onChange({ startDate: todayStr, endDate: todayStr });
      return;
    }

    const past = new Date();
    if (preset === '7days') {
      past.setDate(now.getDate() - 7);
    } else if (preset === '30days') {
      past.setDate(now.getDate() - 30);
    }

    const pastStr = past.toISOString().split('T')[0];
    onChange({ startDate: pastStr, endDate: todayStr });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 shadow-sm text-xs text-slate-700 dark:text-slate-300">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="date"
          value={range.startDate}
          onChange={(e) => onChange({ ...range, startDate: e.target.value })}
          className="bg-transparent border-0 p-0 text-xs focus:ring-0 text-slate-800 dark:text-slate-200"
        />
        <span className="text-slate-400">to</span>
        <input
          type="date"
          value={range.endDate}
          onChange={(e) => onChange({ ...range, endDate: e.target.value })}
          className="bg-transparent border-0 p-0 text-xs focus:ring-0 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Preset shortcut pills */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPreset('all')}
          className={`px-2 py-1 rounded text-xs transition ${
            !range.startDate && !range.endDate
              ? 'bg-[#714B67] text-white font-medium'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setPreset('today')}
          className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setPreset('7days')}
          className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Last 7d
        </button>
        <button
          type="button"
          onClick={() => setPreset('30days')}
          className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Last 30d
        </button>
      </div>
    </div>
  );
};
