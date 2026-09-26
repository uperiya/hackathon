import React from 'react';
import { Filter, X } from 'lucide-react';
import { Warehouse, Category } from '../../types';

export interface FilterState {
  status?: string;
  warehouseId?: string;
  categoryId?: string;
  documentType?: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  warehouses?: Warehouse[];
  categories?: Category[];
  showDocType?: boolean;
  showCategory?: boolean;
  showWarehouse?: boolean;
  showStatus?: boolean;
  statusOptions?: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  warehouses = [],
  categories = [],
  showDocType = false,
  showCategory = true,
  showWarehouse = true,
  showStatus = true,
  statusOptions = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
}) => {
  const hasActiveFilters = Object.values(filters).some(val => Boolean(val));

  const clearAll = () => {
    onChange({
      status: '',
      warehouseId: '',
      categoryId: '',
      documentType: '',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 py-1 text-xs">
      <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>Filters:</span>
      </div>

      {showDocType && (
        <select
          value={filters.documentType || ''}
          onChange={(e) => onChange({ ...filters, documentType: e.target.value })}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-2.5 text-slate-700 dark:text-slate-200 shadow-sm focus:ring-1 focus:ring-[#714B67]"
        >
          <option value="">All Document Types</option>
          <option value="Receipts">Receipts</option>
          <option value="Deliveries">Delivery Orders</option>
          <option value="Transfers">Internal Transfers</option>
          <option value="Adjustments">Stock Adjustments</option>
        </select>
      )}

      {showStatus && (
        <select
          value={filters.status || ''}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-2.5 text-slate-700 dark:text-slate-200 shadow-sm focus:ring-1 focus:ring-[#714B67]"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      )}

      {showWarehouse && warehouses.length > 0 && (
        <select
          value={filters.warehouseId || ''}
          onChange={(e) => onChange({ ...filters, warehouseId: e.target.value })}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-2.5 text-slate-700 dark:text-slate-200 shadow-sm focus:ring-1 focus:ring-[#714B67]"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      )}

      {showCategory && categories.length > 0 && (
        <select
          value={filters.categoryId || ''}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value })}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-2.5 text-slate-700 dark:text-slate-200 shadow-sm focus:ring-1 focus:ring-[#714B67]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-medium"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear Filters</span>
        </button>
      )}
    </div>
  );
};
