import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  FileSpreadsheet,
  Download,
  Package,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  Layers,
  ArrowLeftRight
} from 'lucide-react';
import { Product, Warehouse, Location, StockBalance, StockLedgerEntry, Category } from '../types';
import { getCollectionData, subscribeToCollection } from '../lib/storage';
import { exportReportToExcel } from '../lib/excel';
import { DataTable, Column } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../lib/utils';

type ReportType = 
  | 'current_stock'
  | 'low_stock'
  | 'stock_movement'
  | 'warehouse_stock'
  | 'product_stock';

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('current_stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const loadAll = async () => {
      const [prods, whs, locs, bals, ledgs, cats] = await Promise.all([
        getCollectionData<Product>('products'),
        getCollectionData<Warehouse>('warehouses'),
        getCollectionData<Location>('locations'),
        getCollectionData<StockBalance>('stockBalances'),
        getCollectionData<StockLedgerEntry>('stockLedger'),
        getCollectionData<Category>('categories')
      ]);

      setProducts(prods);
      setWarehouses(whs);
      setLocations(locs);
      setBalances(bals);
      setLedger(ledgs);
      setCategories(cats);
      setLoading(false);
    };

    loadAll();
  }, []);

  // 1. Current Stock Report Data
  const currentStockData = useMemo(() => {
    return products
      .filter(p => p.active)
      .filter(p => !categoryFilter || p.categoryId === categoryFilter)
      .map(p => {
        const stockVal = (p.totalStock || 0) * (p.cost || 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.categoryName || 'General',
          unit: p.unitOfMeasure,
          totalStock: p.totalStock,
          availableStock: p.availableStock,
          reorderLevel: p.reorderLevel,
          cost: p.cost || 0,
          stockValue: stockVal,
          status: p.totalStock <= 0 ? 'Out of Stock' : (p.availableStock <= p.reorderLevel ? 'Low Stock' : 'In Stock')
        };
      });
  }, [products, categoryFilter]);

  // 2. Low Stock Report Data
  const lowStockData = useMemo(() => {
    return currentStockData
      .filter(p => p.availableStock <= p.reorderLevel)
      .map(p => ({
        ...p,
        deficit: Math.max(0, p.reorderLevel - p.availableStock),
        recommendedOrder: Math.max(p.reorderLevel * 2 - p.availableStock, p.reorderLevel)
      }));
  }, [currentStockData]);

  // 3. Stock Movement Report Data
  const stockMovementData = useMemo(() => {
    return ledger.map(l => ({
      id: l.id,
      date: l.createdAt,
      reference: l.referenceNumber,
      product: l.productName,
      sku: l.sku,
      operation: l.operationType,
      quantity: l.quantity,
      from: l.fromLocationName || '-',
      to: l.toLocationName || '-',
      user: l.userName
    }));
  }, [ledger]);

  // 4. Warehouse Stock Report Data
  const warehouseStockData = useMemo(() => {
    const list: any[] = [];
    warehouses.forEach(wh => {
      if (warehouseFilter && wh.id !== warehouseFilter) return;

      const whBalances = balances.filter(b => b.warehouseId === wh.id);
      whBalances.forEach(bal => {
        const prod = products.find(p => p.id === bal.productId);
        const loc = locations.find(l => l.id === bal.locationId);
        if (prod && loc) {
          list.push({
            id: bal.id,
            warehouse: wh.name,
            warehouseCode: wh.code,
            location: loc.name,
            product: prod.name,
            sku: prod.sku,
            quantity: bal.quantity,
            unit: prod.unitOfMeasure,
            totalVal: (bal.quantity || 0) * (prod.cost || 0)
          });
        }
      });
    });
    return list;
  }, [warehouses, balances, products, locations, warehouseFilter]);

  // 5. Product Stock Report Data
  const productStockData = useMemo(() => {
    return products.map(p => {
      const prodBalances = balances.filter(b => b.productId === p.id);
      const whBreakdown = prodBalances.map(b => {
        const loc = locations.find(l => l.id === b.locationId);
        return `${loc?.name || 'Loc'}: ${b.quantity}`;
      }).join(' | ');

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        totalStock: p.totalStock,
        availableStock: p.availableStock,
        unit: p.unitOfMeasure,
        locations: whBreakdown || 'None',
        reorderLevel: p.reorderLevel
      };
    });
  }, [products, balances, locations]);

  // Export handlers
  const handleExportExcel = () => {
    const map = {
      current_stock: { data: currentStockData, sheet: 'Current Stock', name: 'StockSense_Current_Stock_Report.xlsx' },
      low_stock: { data: lowStockData, sheet: 'Low Stock Alerts', name: 'StockSense_Low_Stock_Report.xlsx' },
      stock_movement: { data: stockMovementData, sheet: 'Stock Movements', name: 'StockSense_Stock_Movement_Report.xlsx' },
      warehouse_stock: { data: warehouseStockData, sheet: 'Warehouse Stock', name: 'StockSense_Warehouse_Stock_Report.xlsx' },
      product_stock: { data: productStockData, sheet: 'Product Locations', name: 'StockSense_Product_Stock_Report.xlsx' },
    };

    const target = map[selectedReport];
    exportReportToExcel(target.data, target.sheet, target.name);
  };

  const handleExportCSV = () => {
    let rows: any[] = [];
    if (selectedReport === 'current_stock') rows = currentStockData;
    else if (selectedReport === 'low_stock') rows = lowStockData;
    else if (selectedReport === 'stock_movement') rows = stockMovementData;
    else if (selectedReport === 'warehouse_stock') rows = warehouseStockData;
    else rows = productStockData;

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `StockSense_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-600" />
            <span>Operational Inventory Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-grade inventory reporting, warehouse valuations, and replenishment schedules.
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
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 no-print">
        <button
          onClick={() => setSelectedReport('current_stock')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedReport === 'current_stock'
              ? 'bg-[#714B67] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>1. Current Stock</span>
        </button>

        <button
          onClick={() => setSelectedReport('low_stock')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedReport === 'low_stock'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>2. Low Stock Alerts ({lowStockData.length})</span>
        </button>

        <button
          onClick={() => setSelectedReport('stock_movement')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedReport === 'stock_movement'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>3. Stock Movement</span>
        </button>

        <button
          onClick={() => setSelectedReport('warehouse_stock')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedReport === 'warehouse_stock'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <WarehouseIcon className="w-3.5 h-3.5" />
          <span>4. Warehouse Breakdown</span>
        </button>

        <button
          onClick={() => setSelectedReport('product_stock')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            selectedReport === 'product_stock'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>5. Product Stock</span>
        </button>
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4 text-xs no-print">
        <span className="font-semibold text-slate-500 uppercase tracking-wider">Report Filters:</span>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        {(categoryFilter || warehouseFilter) && (
          <button
            onClick={() => { setCategoryFilter(''); setWarehouseFilter(''); }}
            className="text-xs text-rose-600 font-semibold hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* REPORT CONTENT VIEWPORTS */}
      {selectedReport === 'current_stock' && (
        <DataTable
          columns={[
            { key: 'name', header: 'Product Name', sortable: true },
            { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-slate-500">{r.sku}</span> },
            { key: 'category', header: 'Category' },
            { key: 'totalStock', header: 'Total Stock', align: 'right', sortable: true, render: r => <span className="font-bold">{r.totalStock} {r.unit}</span> },
            { key: 'availableStock', header: 'Available', align: 'right', sortable: true },
            { key: 'cost', header: 'Unit Cost', align: 'right', render: r => `$${r.cost.toFixed(2)}` },
            { key: 'stockValue', header: 'Valuation ($)', align: 'right', sortable: true, render: r => <span className="font-bold font-mono text-slate-900 dark:text-white">${r.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
            { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} size="sm" /> }
          ]}
          data={currentStockData}
          loading={loading}
          pageSize={12}
        />
      )}

      {selectedReport === 'low_stock' && (
        <DataTable
          columns={[
            { key: 'name', header: 'Low Stock Product', sortable: true },
            { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-slate-500">{r.sku}</span> },
            { key: 'availableStock', header: 'Available Units', align: 'right', render: r => <span className="font-black text-rose-600">{r.availableStock} {r.unit}</span> },
            { key: 'reorderLevel', header: 'Min Safety Level', align: 'right' },
            { key: 'deficit', header: 'Shortage (Deficit)', align: 'right', render: r => <span className="font-bold text-amber-600">-{r.deficit} {r.unit}</span> },
            { key: 'recommendedOrder', header: 'Suggested Order Qty', align: 'right', render: r => <span className="font-bold text-[#017E84]">+{r.recommendedOrder} {r.unit}</span> },
            { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} size="sm" /> }
          ]}
          data={lowStockData}
          loading={loading}
          pageSize={12}
        />
      )}

      {selectedReport === 'stock_movement' && (
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: r => <span className="font-mono text-xs">{formatDate(r.date)}</span> },
            { key: 'reference', header: 'Doc Reference', render: r => <span className="font-mono font-bold">{r.reference}</span> },
            { key: 'product', header: 'Product' },
            { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-slate-500">{r.sku}</span> },
            { key: 'operation', header: 'Operation', render: r => <StatusBadge status={r.operation} size="sm" /> },
            { key: 'quantity', header: 'Quantity', align: 'right', render: r => <span className="font-bold">{r.quantity}</span> },
            { key: 'from', header: 'From' },
            { key: 'to', header: 'To' },
            { key: 'user', header: 'Staff' }
          ]}
          data={stockMovementData}
          loading={loading}
          pageSize={12}
        />
      )}

      {selectedReport === 'warehouse_stock' && (
        <DataTable
          columns={[
            { key: 'warehouse', header: 'Facility Name', sortable: true },
            { key: 'location', header: 'Location / Rack', sortable: true },
            { key: 'product', header: 'Product Stored', sortable: true },
            { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-slate-500">{r.sku}</span> },
            { key: 'quantity', header: 'Quantity On-Hand', align: 'right', sortable: true, render: r => <span className="font-bold text-slate-900 dark:text-white">{r.quantity} {r.unit}</span> },
            { key: 'totalVal', header: 'Location Value ($)', align: 'right', render: r => `$${r.totalVal.toFixed(2)}` }
          ]}
          data={warehouseStockData}
          loading={loading}
          pageSize={12}
        />
      )}

      {selectedReport === 'product_stock' && (
        <DataTable
          columns={[
            { key: 'name', header: 'Product', sortable: true },
            { key: 'sku', header: 'SKU', render: r => <span className="font-mono text-slate-500">{r.sku}</span> },
            { key: 'totalStock', header: 'Total Units', align: 'right', render: r => <span className="font-bold">{r.totalStock} {r.unit}</span> },
            { key: 'availableStock', header: 'Available Units', align: 'right' },
            { key: 'locations', header: 'Rack Allocation Breakdown' }
          ]}
          data={productStockData}
          loading={loading}
          pageSize={12}
        />
      )}
    </div>
  );
};
