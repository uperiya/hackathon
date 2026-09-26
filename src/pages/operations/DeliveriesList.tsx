import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { Delivery, Warehouse } from '../../types';
import { subscribeToCollection } from '../../lib/storage';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../lib/utils';

export const DeliveriesList: React.FC = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  useEffect(() => {
    const unsubDels = subscribeToCollection<Delivery>('deliveries', (data) => {
      setDeliveries(data);
      setLoading(false);
    });
    const unsubWhs = subscribeToCollection<Warehouse>('warehouses', setWarehouses);

    return () => {
      unsubDels();
      unsubWhs();
    };
  }, []);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = d.deliveryNumber.toLowerCase().includes(q);
        const matchCust = d.customer.toLowerCase().includes(q);
        const matchItem = d.items?.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchNum && !matchCust && !matchItem) return false;
      }

      if (statusFilter && d.status !== statusFilter) return false;
      if (warehouseFilter && d.sourceWarehouseId !== warehouseFilter) return false;

      return true;
    });
  }, [deliveries, searchQuery, statusFilter, warehouseFilter]);

  const columns: Column<Delivery>[] = [
    {
      key: 'deliveryNumber',
      header: 'Delivery #',
      sortable: true,
      render: (d) => (
        <div>
          <span
            onClick={() => navigate(`/operations/deliveries/${d.id}`)}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer block font-mono"
          >
            {d.deliveryNumber}
          </span>
          <span className="text-[11px] text-slate-400">
            {formatDate(d.date, 'MMM dd, yyyy')}
          </span>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer / Recipient',
      sortable: true,
      render: (d) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {d.customer}
        </span>
      )
    },
    {
      key: 'sourceWarehouseName',
      header: 'Source Warehouse',
      render: (d) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div className="font-medium text-slate-800 dark:text-slate-200">{d.sourceWarehouseName}</div>
          <div className="text-[11px] text-slate-400">{d.sourceLocationName}</div>
        </div>
      )
    },
    {
      key: 'items',
      header: 'Ordered Items',
      render: (d) => {
        const count = d.items?.length || 0;
        const first = d.items?.[0];
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
      header: 'Prepared By',
      render: (d) => <span className="text-xs text-slate-500">{d.createdByName}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (d) => <StatusBadge status={d.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-indigo-600" />
            <span>Delivery Orders (Outgoing Goods)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage customer shipments, verify product availability, and deduct stock upon final dispatch.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/operations/deliveries/new')}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Create Delivery Order
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by delivery #, customer, or product..."
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
        data={filteredDeliveries}
        loading={loading}
        pageSize={10}
        onRowClick={(d) => navigate(`/operations/deliveries/${d.id}`)}
        emptyTitle="No delivery orders found"
        emptyDescription="Create a new delivery order to ship finished goods to customers."
        emptyActionText="Create Delivery Order"
        onEmptyAction={() => navigate('/operations/deliveries/new')}
      />
    </div>
  );
};
