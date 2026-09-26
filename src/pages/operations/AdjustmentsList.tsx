import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Adjustment, Warehouse } from '../../types';
import { subscribeToCollection } from '../../lib/storage';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../lib/utils';

export const AdjustmentsList: React.FC = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubAdjs = subscribeToCollection<Adjustment>('adjustments', (data) => {
      setAdjustments(data);
      setLoading(false);
    });
    const unsubWhs = subscribeToCollection<Warehouse>('warehouses', setWarehouses);

    return () => {
      unsubAdjs();
      unsubWhs();
    };
  }, []);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.adjustmentNumber.toLowerCase().includes(q) ||
        a.productName.toLowerCase().includes(q) ||
        a.sku.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
      );
    });
  }, [adjustments, searchQuery]);

  const columns: Column<Adjustment>[] = [
    {
      key: 'adjustmentNumber',
      header: 'Adjustment #',
      sortable: true,
      render: (a) => (
        <div>
          <span className="font-bold text-amber-700 dark:text-amber-400 block font-mono">
            {a.adjustmentNumber}
          </span>
          <span className="text-[11px] text-slate-400">
            {formatDate(a.date, 'MMM dd, yyyy')}
          </span>
        </div>
      )
    },
    {
      key: 'productName',
      header: 'Product Counted',
      sortable: true,
      render: (a) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{a.productName}</span>
          <span className="text-xs text-slate-400 font-mono ml-2">[{a.sku}]</span>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Facility / Location',
      render: (a) => (
        <div className="text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">{a.warehouseName}</span>
          <span className="text-slate-400 block text-[11px]">{a.locationName}</span>
        </div>
      )
    },
    {
      key: 'systemQuantity',
      header: 'System Count',
      align: 'right',
      render: (a) => (
        <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
          {a.systemQuantity} {a.unitOfMeasure}
        </span>
      )
    },
    {
      key: 'physicalQuantity',
      header: 'Physical Count',
      align: 'right',
      render: (a) => (
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {a.physicalQuantity} {a.unitOfMeasure}
        </span>
      )
    },
    {
      key: 'difference',
      header: 'Difference',
      align: 'right',
      render: (a) => {
        const diff = a.difference;
        return (
          <span className={`font-black font-mono text-xs px-2 py-0.5 rounded ${
            diff > 0
              ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
              : diff < 0
              ? 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
              : 'text-slate-600 bg-slate-100 dark:bg-slate-800'
          }`}>
            {diff > 0 ? `+${diff}` : diff} {a.unitOfMeasure}
          </span>
        );
      }
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (a) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1" title={a.notes || a.reason}>
          {a.reason}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge status={a.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-amber-600" />
            <span>Inventory Adjustments & Stock Counting</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reconcile recorded software inventory against physical warehouse counts with audit reason tracking.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/operations/adjustments/new')}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          New Stock Count
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by adjustment #, product, or reason..."
          className="w-full sm:w-96"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredAdjustments}
        loading={loading}
        pageSize={10}
        emptyTitle="No inventory adjustments found"
        emptyDescription="Execute a physical stock count to reconcile recorded and actual on-hand quantities."
        emptyActionText="Start Stock Count"
        onEmptyAction={() => navigate('/operations/adjustments/new')}
      />
    </div>
  );
};
