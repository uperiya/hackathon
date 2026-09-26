import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, FileSpreadsheet, Download, Filter, RefreshCw } from 'lucide-react';
import { StockLedgerEntry, Product, Warehouse, Location, StockOperationType } from '../types';
import { subscribeToCollection, getCollectionData } from '../lib/storage';
import { exportMoveHistoryToExcel } from '../lib/excel';
import { DataTable, Column } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { DateRangePicker, DateRange } from '../components/common/DateRangePicker';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../lib/utils';

export const MoveHistory: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('sku') || '');
  const [selectedOperation, setSelectedOperation] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });

  useEffect(() => {
    const unsubLedg = subscribeToCollection<StockLedgerEntry>('stockLedger', (data: StockLedgerEntry[]) => {
      setLedger(data);
      setLoading(false);
    });
    const unsubProds = subscribeToCollection<Product>('products', setProducts);
    const unsubWhs = subscribeToCollection<Warehouse>('warehouses', setWarehouses);
    const unsubLocs = subscribeToCollection<Location>('locations', setLocations);

    return () => {
      unsubLedg();
      unsubProds();
      unsubWhs();
      unsubLocs();
    };
  }, []);

  // Distinct users found in ledger
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    ledger.forEach(e => { if (e.userName) set.add(e.userName); });
    return Array.from(set);
  }, [ledger]);

  // Filtering engine
  const filteredLedger = useMemo(() => {
    return ledger.filter(item => {
      // Instant text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProd = item.productName?.toLowerCase().includes(q);
        const matchSku = item.sku?.toLowerCase().includes(q);
        const matchRef = item.referenceNumber?.toLowerCase().includes(q);
        const matchNote = item.notes?.toLowerCase().includes(q);
        if (!matchProd && !matchSku && !matchRef && !matchNote) return false;
      }

      // Operation filter
      if (selectedOperation && item.operationType !== selectedOperation) {
        return false;
      }

      // Warehouse filter
      if (selectedWarehouse) {
        const matchWh = item.fromWarehouseId === selectedWarehouse || item.toWarehouseId === selectedWarehouse;
        if (!matchWh) return false;
      }

      // Location filter
      if (selectedLocation) {
        const matchLoc = item.fromLocationId === selectedLocation || item.toLocationId === selectedLocation;
        if (!matchLoc) return false;
      }

      // User filter
      if (selectedUser && item.userName !== selectedUser) {
        return false;
      }

      // Date range filter
      if (dateRange.startDate) {
        const itemDate = item.createdAt.split('T')[0];
        if (itemDate < dateRange.startDate) return false;
      }
      if (dateRange.endDate) {
        const itemDate = item.createdAt.split('T')[0];
        if (itemDate > dateRange.endDate) return false;
      }

      return true;
    });
  }, [ledger, searchQuery, selectedOperation, selectedWarehouse, selectedUser, dateRange]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Reference', 'Product', 'SKU', 'Operation', 'Quantity', 'Before', 'After', 'From', 'To', 'User', 'Notes'];
    const rows = filteredLedger.map(e => [
      e.createdAt,
      e.referenceNumber,
      `"${e.productName.replace(/"/g, '""')}"`,
      e.sku,
      e.operationType,
      e.quantity,
      e.beforeQuantity,
      e.afterQuantity,
      `"${(e.fromLocationName || '-').replace(/"/g, '""')}"`,
      `"${(e.toLocationName || '-').replace(/"/g, '""')}"`,
      `"${e.userName.replace(/"/g, '""')}"`,
      `"${(e.notes || '-').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockSense_Move_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<StockLedgerEntry>[] = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (e) => (
        <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
          {formatDate(e.createdAt)}
        </span>
      )
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      sortable: true,
      render: (e) => (
        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
          {e.referenceNumber}
        </span>
      )
    },
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (e) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white block">{e.productName}</span>
          <span className="text-[11px] text-slate-400 font-mono">SKU: {e.sku}</span>
        </div>
      )
    },
    {
      key: 'operationType',
      header: 'Operation',
      sortable: true,
      render: (e) => <StatusBadge status={e.operationType} size="sm" />
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      align: 'right',
      render: (e) => {
        const isNeg = e.operationType === 'DELIVERY' || e.operationType === 'ADJUSTMENT_OUT';
        return (
          <span className={`font-black font-mono text-xs ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isNeg ? '-' : '+'}{e.quantity}
          </span>
        );
      }
    },
    {
      key: 'from',
      header: 'From (Source)',
      render: (e) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {e.fromWarehouseName ? `${e.fromWarehouseName} / ${e.fromLocationName}` : '-'}
        </div>
      )
    },
    {
      key: 'to',
      header: 'To (Destination)',
      render: (e) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {e.toWarehouseName ? `${e.toWarehouseName} / ${e.toLocationName}` : '-'}
        </div>
      )
    },
    {
      key: 'balanceFlow',
      header: 'Before -> After',
      align: 'right',
      render: (e) => (
        <span className="text-xs font-mono text-slate-400">
          {e.beforeQuantity} &rarr; <span className="font-bold text-slate-700 dark:text-slate-300">{e.afterQuantity}</span>
        </span>
      )
    },
    {
      key: 'userName',
      header: 'User',
      render: (e) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{e.userName}</span>
    },
    {
      key: 'notes',
      header: 'Audit Notes',
      render: (e) => (
        <span className="text-[11px] text-slate-500 line-clamp-1 max-w-xs" title={e.notes}>
          {e.notes || '-'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#714B67]" />
            <span>Stock Move History & Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographically immutable stock transaction ledger tracking every intake, dispatch, transfer, and adjustment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMoveHistoryToExcel(filteredLedger)}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Multi-Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Instant search by product, SKU, reference #, or note..."
            className="w-full lg:w-96"
          />

          <DateRangePicker
            range={dateRange}
            onChange={setDateRange}
          />
        </div>

        {/* Dropdown Select Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <select
            value={selectedOperation}
            onChange={(e) => setSelectedOperation(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Operations</option>
            <option value="RECEIPT">RECEIPT (Intake)</option>
            <option value="DELIVERY">DELIVERY (Dispatch)</option>
            <option value="TRANSFER">TRANSFER (Relocate)</option>
            <option value="ADJUSTMENT_IN">ADJUSTMENT IN (+Surplus)</option>
            <option value="ADJUSTMENT_OUT">ADJUSTMENT OUT (-Deficit)</option>
          </select>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Locations</option>
            {locations
              .filter(l => !selectedWarehouse || l.warehouseId === selectedWarehouse)
              .map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Users</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          {(searchQuery || selectedOperation || selectedWarehouse || selectedLocation || selectedUser || dateRange.startDate || dateRange.endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedOperation('');
                setSelectedWarehouse('');
                setSelectedLocation('');
                setSelectedUser('');
                setDateRange({ startDate: '', endDate: '' });
              }}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline px-2"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredLedger}
        loading={loading}
        pageSize={12}
        emptyTitle="No movement records found"
        emptyDescription="There are no stock movements matching the current filter criteria."
      />
    </div>
  );
};
