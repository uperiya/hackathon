import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  FileSpreadsheet,
  UploadCloud,
  Eye,
  Edit2,
  Trash2,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Product, Category, Warehouse, Location } from '../../types';
import { getCollectionData, subscribeToCollection, updateDocumentData } from '../../lib/storage';
import { exportProductsToExcel } from '../../lib/excel';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProductFormModal } from './ProductFormModal';
import { ProductImportModal } from './ProductImportModal';

export const ProductsList: React.FC = () => {
  const { role, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const unsubProds = subscribeToCollection<Product>('products', (data) => {
      setProducts(data);
      setLoading(false);
    });
    const unsubCats = subscribeToCollection<Category>('categories', setCategories);
    const unsubWhs = subscribeToCollection<Warehouse>('warehouses', setWarehouses);
    const unsubLocs = subscribeToCollection<Location>('locations', setLocations);

    return () => {
      unsubProds();
      unsubCats();
      unsubWhs();
      unlocs();
    };
    function unlocs() {
      unsubLocs();
    }
  }, []);

  const existingSkus = useMemo(() => new Set(products.map(p => p.sku.toUpperCase())), [products]);

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      // Category filter
      if (selectedCategory && p.categoryId !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter) {
        if (stockStatusFilter === 'Out of Stock' && p.totalStock > 0) return false;
        if (stockStatusFilter === 'Low Stock' && (p.totalStock <= 0 || p.availableStock > p.reorderLevel)) return false;
        if (stockStatusFilter === 'In Stock' && (p.totalStock <= 0 || p.availableStock <= p.reorderLevel)) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, stockStatusFilter]);

  const handleDeactivate = async () => {
    if (!deactivatingProduct) return;
    try {
      await updateDocumentData('products', deactivatingProduct.id, {
        active: !deactivatingProduct.active
      });
      showToast(
        'success',
        `Product '${deactivatingProduct.name}' ${deactivatingProduct.active ? 'deactivated' : 'activated'} successfully.`
      );
      setDeactivatingProduct(null);
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed');
    }
  };

  const isManager = hasPermission('Inventory Manager');

  // Columns definition
  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#714B67] dark:text-purple-300 flex items-center justify-center font-bold text-xs">
            {p.name.charAt(0)}
          </div>
          <div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/products/${p.id}`);
              }}
              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-[#714B67] hover:underline cursor-pointer block"
            >
              {p.name}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              SKU: {p.sku}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      sortable: true,
      render: (p) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {p.categoryName || 'General'}
        </span>
      ),
    },
    {
      key: 'unitOfMeasure',
      header: 'Unit',
      render: (p) => <span className="text-xs font-mono text-slate-500">{p.unitOfMeasure}</span>,
    },
    {
      key: 'totalStock',
      header: 'Total Stock',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {p.totalStock}
        </span>
      ),
    },
    {
      key: 'availableStock',
      header: 'Available',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span className={`font-semibold ${
          p.availableStock <= 0
            ? 'text-rose-600'
            : p.availableStock <= p.reorderLevel
            ? 'text-amber-600'
            : 'text-slate-700 dark:text-slate-300'
        }`}>
          {p.availableStock}
        </span>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Level',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span className="text-xs font-medium text-slate-500">
          {p.reorderLevel}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (p) => {
        let badge: string = 'In Stock';
        if (!p.active) badge = 'Inactive';
        else if (p.totalStock <= 0) badge = 'Out of Stock';
        else if (p.availableStock <= p.reorderLevel) badge = 'Low Stock';
        return <StatusBadge status={badge} size="sm" />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/products/${p.id}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {isManager && (
            <button
              onClick={() => {
                setProductToEdit(p);
                setIsFormModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#714B67] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
              title="Edit Product"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => navigate(`/move-history?sku=${encodeURIComponent(p.sku)}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition"
            title="View Movement History"
          >
            <History className="w-4 h-4" />
          </button>

          {isManager && (
            <button
              onClick={() => setDeactivatingProduct(p)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title={p.active ? 'Deactivate Product' : 'Activate Product'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Product Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage product catalog, location quantities, reorder thresholds, and SKU codes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportProductsToExcel(filteredProducts)}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export Excel
          </Button>

          {isManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              icon={<UploadCloud className="w-3.5 h-3.5 text-blue-600" />}
            >
              Import Excel
            </Button>
          )}

          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setProductToEdit(null);
                setIsFormModalOpen(true);
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Create Product
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter by product name or SKU..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Health Dropdown */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <option value="">All Stock Levels</option>
            <option value="In Stock">In Stock (Healthy)</option>
            <option value="Low Stock">Low Stock (Alert)</option>
            <option value="Out of Stock">Out of Stock (Zero)</option>
          </select>

          {(searchQuery || selectedCategory || stockStatusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setStockStatusFilter('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        loading={loading}
        pageSize={10}
        onRowClick={(p) => navigate(`/products/${p.id}`)}
        emptyTitle="No products match your criteria"
        emptyDescription="Try clearing filters or search term to see all inventory."
        emptyActionText={isManager ? "Create New Product" : undefined}
        onEmptyAction={() => {
          setProductToEdit(null);
          setIsFormModalOpen(true);
        }}
      />

      {/* Product Create / Edit Modal */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        productToEdit={productToEdit}
        onSaved={() => {}}
        existingSkus={existingSkus}
        categories={categories}
        warehouses={warehouses}
        locations={locations}
      />

      {/* Product Excel Import Modal */}
      <ProductImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {}}
        existingSkus={existingSkus}
        categories={categories}
        warehouses={warehouses}
        locations={locations}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivatingProduct)}
        onClose={() => setDeactivatingProduct(null)}
        onConfirm={handleDeactivate}
        title={deactivatingProduct?.active ? "Deactivate Product" : "Reactivate Product"}
        message={`Are you sure you want to ${
          deactivatingProduct?.active ? 'deactivate' : 'reactivate'
        } '${deactivatingProduct?.name}'?`}
        variant={deactivatingProduct?.active ? 'danger' : 'success'}
      />
    </div>
  );
};
