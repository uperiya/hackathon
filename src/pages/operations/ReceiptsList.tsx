import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, Plus, Calendar, Building, MapPin, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Receipt, Warehouse, Location } from '../../types';
import { subscribeToCollection } from '../../lib/storage';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../lib/utils';

export const ReceiptsList: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  useEffect(() => {
    const unsubRecs = subscribeToCollection<Receipt>('receipts', (data) => {
      setReceipts(data);
      setLoading(false);
    });
    const unsubWhs = subscribeToCollection<Warehouse>('warehouses', setWarehouses);

    return () => {
      unsubRecs();
      unsubWhs();
    };
  }, []);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = r.receiptNumber.toLowerCase().includes(q);
        const matchSupplier = r.supplier.toLowerCase().includes(q);
        const matchItem = r.items?.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchNum && !matchSupplier && !matchItem) return false;
      }

      if (statusFilter && r.status !== statusFilter) return false;
      if (warehouseFilter && r.destinationWarehouseId !== warehouseFilter) return false;

      return true;
    });
  }, [receipts, searchQuery, statusFilter, warehouseFilter]);

  const columns: Column<Receipt>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      sortable: true,
      render: (r) => (
        <div>
          <span
            onClick={() => navigate(`/operations/receipts/${r.id}`)}
            className="font-bold text-[#017E84] dark:text-teal-400 hover:underline cursor-pointer block font-mono"
          >
            {r.receiptNumber}
          </span>
          <span className="text-[11px] text-slate-400">
            {formatDate(r.date, 'MMM dd, yyyy')}
          </span>
        </div>
      )
    },
    {
      key: 'supplier',
      header: 'Supplier / Vendor',
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {r.supplier}
        </span>
      )
    },
    {
      key: 'destinationWarehouseName',
      header: 'Destination Facility',
      render: (r) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div className="font-medium text-slate-800 dark:text-slate-200">{r.destinationWarehouseName}</div>
          <div className="text-[11px] text-slate-400">{r.destinationLocationName}</div>
        </div>
      )
    },
    {
      key: 'items',
      header: 'Products',
      render: (r) => {
        const count = r.items?.length || 0;
        const first = r.items?.[0];
        return (
          <div className="text-xs">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {first ? `${first.quantity}x ${first.productName}` : '-'}
            </span>
            {count > 1 && (
              <span className="text-slate-400 ml-1.5 font-normal">
                (+{count - 1} more)
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'createdByName',
      header: 'Created By',
      render: (r) => <span className="text-xs text-slate-500">{r.createdByName}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-[#017E84]" />
            <span>Receipts (Incoming Goods)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Process supplier deliveries, verify quantities, and intake stock into destination warehouse racks.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/operations/receipts/new')}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Create Receipt
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by receipt #, vendor, or product..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Waiting">Waiting</option>
            <option value="Ready">Ready</option>
            <option value="Done">Done</option>
            <option value="Canceled">Canceled</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {(searchQuery || statusFilter || warehouseFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setWarehouseFilter('');
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
        data={filteredReceipts}
        loading={loading}
        pageSize={10}
        onRowClick={(r) => navigate(`/operations/receipts/${r.id}`)}
        emptyTitle="No receipts found"
        emptyDescription="Create a new receipt to record incoming products from vendors."
        emptyActionText="Create Receipt"
        onEmptyAction={() => navigate('/operations/receipts/new')}
      />
    </div>
  );
};
