import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Edit,
  History,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  MapPin,
  TrendingUp,
  Tag,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Product, StockBalance, StockLedgerEntry, Warehouse, Location, Category } from '../../types';
import { getDocumentData, getCollectionData, subscribeToCollection } from '../../lib/storage';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable, Column } from '../../components/common/DataTable';
import { formatDate } from '../../lib/utils';
import { ProductFormModal } from './ProductFormModal';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [product, setProduct] = useState<Product | null>(null);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      const [prod, allBalances, allWhs, allLocs, allCats, allLedg] = await Promise.all([
        getDocumentData<Product>('products', id),
        getCollectionData<StockBalance>('stockBalances'),
        getCollectionData<Warehouse>('warehouses'),
        getCollectionData<Location>('locations'),
        getCollectionData<Category>('categories'),
        getCollectionData<StockLedgerEntry>('stockLedger')
      ]);

      setProduct(prod);
      setBalances(allBalances.filter(b => b.productId === id));
      setWarehouses(allWhs);
      setLocations(allLocs);
      setCategories(allCats);
      setLedger(allLedg.filter(l => l.productId === id));
      setLoading(false);
    };

    loadData();

    const unsub = subscribeToCollection<Product>('products', (prods) => {
      const p = prods.find(item => item.id === id);
      if (p) setProduct(p);
    });

    return () => unsub();
  }, [id]);

  // Group balances by warehouse
  const stockByWarehouse = useMemo(() => {
    return warehouses.map(wh => {
      const whLocations = locations.filter(l => l.warehouseId === wh.id);
      const whBalances = balances.filter(b => b.warehouseId === wh.id);
      const totalUnits = whBalances.reduce((acc, b) => acc + (b.quantity || 0), 0);

      const locationDetails = whLocations.map(loc => {
        const bal = whBalances.find(b => b.locationId === loc.id);
        return {
          locationName: loc.name,
          locationCode: loc.code,
          quantity: bal ? bal.quantity : 0
        };
      });

      return {
        warehouseName: wh.name,
        warehouseCode: wh.code,
        totalUnits,
        locations: locationDetails
      };
    });
  }, [warehouses, locations, balances]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Product Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">The requested product could not be located in inventory.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  const isLowStock = product.availableStock <= product.reorderLevel;
  const isOutOfStock = product.totalStock <= 0;

  const ledgerColumns: Column<StockLedgerEntry>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (e) => <span className="text-slate-500 font-mono text-xs">{formatDate(e.createdAt)}</span>
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (e) => <span className="font-semibold text-slate-800 dark:text-slate-200">{e.referenceNumber}</span>
    },
    {
      key: 'operationType',
      header: 'Operation',
      render: (e) => <StatusBadge status={e.operationType} size="sm" />
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      render: (e) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {e.operationType === 'DELIVERY' || e.operationType === 'ADJUSTMENT_OUT' ? '-' : '+'}
          {e.quantity} {product.unitOfMeasure}
        </span>
      )
    },
    {
      key: 'fromLocationName',
      header: 'From',
      render: (e) => <span className="text-xs text-slate-500">{e.fromLocationName || '-'}</span>
    },
    {
      key: 'toLocationName',
      header: 'To',
      render: (e) => <span className="text-xs text-slate-500">{e.toLocationName || '-'}</span>
    },
    {
      key: 'userName',
      header: 'User',
      render: (e) => <span className="text-xs text-slate-600 dark:text-slate-400">{e.userName}</span>
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Products
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {product.name}
              </h2>
              <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {product.sku}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Category: <span className="font-medium text-slate-700 dark:text-slate-300">{product.categoryName || 'General'}</span> &bull; Unit: <span className="font-mono">{product.unitOfMeasure}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLowStock && (
            <Link to="/operations/receipts/new">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Create Restock Receipt
              </Button>
            </Link>
          )}

          {hasPermission('Inventory Manager') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              icon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit Specs
            </Button>
          )}
        </div>
      </div>

      {/* Stock Health Alert */}
      {isOutOfStock ? (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div>
            <span className="font-bold">OUT OF STOCK:</span> This product currently has zero available units in all facilities. Delivery orders cannot be processed until incoming receipts are validated.
          </div>
        </div>
      ) : isLowStock ? (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <span className="font-bold">LOW STOCK WARNING:</span> Available stock ({product.availableStock} {product.unitOfMeasure}) is at or below the configured reorder threshold ({product.reorderLevel} {product.unitOfMeasure}).
          </div>
        </div>
      ) : null}

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">Total On-Hand</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {product.totalStock} <span className="text-xs font-normal text-slate-500">{product.unitOfMeasure}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">Available Stock</p>
          <p className={`text-2xl font-black mt-1 ${isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
            {product.availableStock} <span className="text-xs font-normal text-slate-500">{product.unitOfMeasure}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">Reorder Threshold</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {product.reorderLevel} <span className="text-xs font-normal text-slate-500">{product.unitOfMeasure}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">Standard Cost / Price</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
            ${product.cost || 0} / ${product.price || 0}
          </p>
        </div>
      </div>

      {/* Stock by Warehouse and Location Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <WarehouseIcon className="w-5 h-5 text-[#714B67]" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Stock Distribution by Warehouse & Location
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stockByWarehouse.map(wh => (
            <div key={wh.warehouseCode} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white text-sm">{wh.warehouseName}</span>
                <span className="font-black text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {wh.totalUnits} {product.unitOfMeasure} Total
                </span>
              </div>

              <div className="space-y-2">
                {wh.locations.map(loc => (
                  <div key={loc.locationCode} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {loc.locationName}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {loc.quantity} {product.unitOfMeasure}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Movement History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#714B67]" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Stock Movement Audit Trail
            </h3>
          </div>
          <span className="text-xs text-slate-400">{ledger.length} operations recorded</span>
        </div>

        <DataTable
          columns={ledgerColumns}
          data={ledger}
          pageSize={5}
          emptyTitle="No stock movements yet"
          emptyDescription="This product has no recorded transactions in the stock ledger."
        />
      </div>

      {/* Edit Modal */}
      <ProductFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        productToEdit={product}
        onSaved={() => {}}
        existingSkus={new Set()}
        categories={categories}
        warehouses={warehouses}
        locations={locations}
      />
    </div>
  );
};
