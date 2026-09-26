import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Plus, MapPin, Building } from 'lucide-react';
import { Transfer, Warehouse } from '../../types';
import { subscribeToCollection } from '../../lib/storage';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../lib/utils';

export const TransfersList: React.FC = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const unsubTrfs = subscribeToCollection<Transfer>('transfers', (data) => {
      setTransfers(data);
      setLoading(false);
    });
    const unsubWhs = subscribeToCollection<Warehouse>('warehouses', setWarehouses);

    return () => {
      unsubTrfs();
      unsubWhs();
    };
  }, []);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = t.transferNumber.toLowerCase().includes(q);
        const matchSrc = t.sourceWarehouseName.toLowerCase().includes(q);
        const matchDest = t.destinationWarehouseName.toLowerCase().includes(q);
        const matchItem = t.items?.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchNum && !matchSrc && !matchDest && !matchItem) return false;
      }

      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [transfers, searchQuery, statusFilter]);

  const columns: Column<Transfer>[] = [
    {
      key: 'transferNumber',
      header: 'Transfer #',
      sortable: true,
      render: (t) => (
        <div>
          <span
            onClick={() => navigate(`/operations/transfers/${t.id}`)}
            className="font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer block font-mono"
          >
            {t.transferNumber}
          </span>
          <span className="text-[11px] text-slate-400">
            {formatDate(t.date, 'MMM dd, yyyy')}
          </span>
        </div>
      )
    },
    {
      key: 'source',
      header: 'Source Location',
      render: (t) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{t.sourceWarehouseName}</div>
          <div className="text-[11px] text-slate-400">{t.sourceLocationName}</div>
        </div>
      )
    },
    {
      key: 'destination',
      header: 'Destination Location',
      render: (t) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{t.destinationWarehouseName}</div>
          <div className="text-[11px] text-slate-400">{t.destinationLocationName}</div>
        </div>
      )
    },
    {
      key: 'items',
      header: 'Product Transferred',
      render: (t) => {
        const count = t.items?.length || 0;
        const first = t.items?.[0];
        return (
          <div className="text-xs">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {first ? `${first.quantity}x ${first.productName}` : '-'}
            </span>
            {count > 1 && (
              <span className="text-slate-400 ml-1 font-normal">(+{count - 1} more)</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'createdByName',
      header: 'Created By',
      render: (t) => <span className="text-xs text-slate-500">{t.createdByName}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-purple-600" />
            <span>Internal Transfers</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Relocate inventory between racks, bays, and multi-warehouse facilities without altering company totals.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/operations/transfers/new')}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Create Transfer
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by transfer #, facility, or product..."
          className="w-full md:w-80"
        />

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Ready">Ready</option>
            <option value="Done">Done</option>
            <option value="Canceled">Canceled</option>
          </select>

          {(searchQuery || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTransfers}
        loading={loading}
        pageSize={10}
        onRowClick={(t) => navigate(`/operations/transfers/${t.id}`)}
        emptyTitle="No internal transfers found"
        emptyDescription="Create a new transfer to move stock between warehouses or racks."
        emptyActionText="Create Transfer"
        onEmptyAction={() => navigate('/operations/transfers/new')}
      />
    </div>
  );
};
