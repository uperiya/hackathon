import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  AlertTriangle,
  ArrowDownLeft,
  CheckCircle2,
  PackageCheck,
  Plus,
  Edit2,
  Trash2,
  Building,
  Filter
} from 'lucide-react';
import { Product, Warehouse, ReorderingRule } from '../../types';
import { reorderingRulesService } from '../../services/reorderingRulesService';
import { productsService } from '../../services/productsService';
import { warehousesService } from '../../services/warehousesService';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';

export const ReorderingRules: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [rules, setRules] = useState<ReorderingRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReorderingRule | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [minQty, setMinQty] = useState<number>(10);
  const [preferredQty, setPreferredQty] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Deletion confirm
  const [deletingRule, setDeletingRule] = useState<ReorderingRule | null>(null);

  useEffect(() => {
    const unsubRules = reorderingRulesService.subscribe(setRules);
    const unsubProds = productsService.subscribe((prods) => {
      setProducts(prods);
      setLoading(false);
    });
    const unsubWhs = warehousesService.subscribe(setWarehouses);

    return () => {
      unsubRules();
      unsubProds();
      unsubWhs();
    };
  }, []);

  const openCreateModal = () => {
    setEditingRule(null);
    setSelectedProductId(products[0]?.id || '');
    setSelectedWarehouseId(warehouses[0]?.id || '');
    setMinQty(10);
    setPreferredQty(30);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (rule: ReorderingRule) => {
    setEditingRule(rule);
    setSelectedProductId(rule.productId);
    setSelectedWarehouseId(rule.warehouseId);
    setMinQty(rule.minQuantity);
    setPreferredQty(rule.preferredQuantity);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!selectedProductId) errs.productId = 'Product is required.';
    if (!selectedWarehouseId) errs.warehouseId = 'Warehouse is required.';
    if (minQty < 0) errs.minQty = 'Minimum quantity cannot be negative.';
    if (preferredQty <= minQty) errs.preferredQty = 'Preferred quantity must be greater than minimum quantity.';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      if (editingRule) {
        await reorderingRulesService.update(editingRule.id, {
          minQuantity: Number(minQty),
          preferredQuantity: Number(preferredQty)
        });
        showToast('success', `Reordering rule for '${editingRule.productName}' updated.`);
      } else {
        await reorderingRulesService.create({
          productId: selectedProductId,
          warehouseId: selectedWarehouseId,
          minQuantity: Number(minQty),
          preferredQuantity: Number(preferredQty)
        });
        showToast('success', 'New reordering rule configured successfully.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save reordering rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    try {
      await reorderingRulesService.delete(deletingRule.id);
      showToast('success', `Reordering rule for '${deletingRule.productName}' deleted.`);
      setDeletingRule(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete rule');
    }
  };

  // Enriched rules with current stock
  const enrichedRules = useMemo(() => {
    return rules.map(rule => {
      const prod = products.find(p => p.id === rule.productId);
      const currentStock = prod ? prod.availableStock : 0;
      const isBelowMin = currentStock <= rule.minQuantity;
      const suggestedReplenish = Math.max(0, rule.preferredQuantity - currentStock);

      return {
        ...rule,
        currentStock,
        isBelowMin,
        suggestedReplenish
      };
    });
  }, [rules, products]);

  const filteredRules = useMemo(() => {
    return enrichedRules.filter(r => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.productName.toLowerCase().includes(q);
        const matchSku = r.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      if (warehouseFilter && r.warehouseId !== warehouseFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedRules, searchQuery, warehouseFilter]);

  const belowMinCount = useMemo(() => {
    return enrichedRules.filter(r => r.isBelowMin).length;
  }, [enrichedRules]);

  const columns: Column<typeof enrichedRules[0]>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (r) => (
        <div>
          <span
            onClick={() => navigate(`/products/${r.productId}`)}
            className="font-bold text-slate-900 dark:text-white hover:text-[#714B67] hover:underline cursor-pointer block"
          >
            {r.productName}
          </span>
          <span className="text-xs text-slate-400 font-mono">SKU: {r.sku}</span>
        </div>
      )
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <span>{r.warehouseName}</span>
        </div>
      )
    },
    {
      key: 'minQuantity',
      header: 'Min Quantity',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
          {r.minQuantity} {r.unitOfMeasure}
        </span>
      )
    },
    {
      key: 'preferredQuantity',
      header: 'Preferred Quantity',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className="font-bold text-slate-900 dark:text-white text-xs">
          {r.preferredQuantity} {r.unitOfMeasure}
        </span>
      )
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className={`font-black text-sm ${r.isBelowMin ? 'text-rose-600' : 'text-emerald-600'}`}>
          {r.currentStock} {r.unitOfMeasure}
        </span>
      )
    },
    {
      key: 'isBelowMin',
      header: 'Status',
      render: (r) => (
        <StatusBadge
          status={r.isBelowMin ? 'Low Stock' : 'In Stock'}
          size="sm"
        />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.isBelowMin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/operations/receipts/new?productId=${r.productId}&suggestedQty=${r.suggestedReplenish}`)}
              icon={<ArrowDownLeft className="w-3 h-3 text-teal-600" />}
              className="text-[11px] py-1 px-2.5"
            >
              Order (+{r.suggestedReplenish})
            </Button>
          )}

          <button
            onClick={() => openEditModal(r)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#714B67] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
            title="Edit Reordering Rule"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDeletingRule(r)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            title="Delete Reordering Rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-[#714B67]" />
            <span>Automated Reordering Rules</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure safety stock thresholds and preferred replenishments by warehouse facility.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          New Reordering Rule
        </Button>
      </div>

      {/* KPI Alert Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Total Configured Rules</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{rules.length}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-[#714B67] rounded-xl">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${
          belowMinCount > 0
            ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div>
            <p className="text-xs text-slate-400">Items Below Minimum</p>
            <p className={`text-xl font-black mt-1 ${belowMinCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
              {belowMinCount}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${belowMinCount > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Warehouse Coverage</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{warehouses.length} facilities</p>
          </div>
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter rules by product name or SKU..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            options={[
              { value: '', label: 'All Warehouses' },
              ...warehouses.map(w => ({ value: w.id, label: w.name }))
            ]}
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full sm:w-48 text-xs"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredRules}
        loading={loading}
        pageSize={10}
        emptyTitle="No reordering rules configured"
        emptyDescription="Define minimum safety thresholds and preferred targets per product and warehouse."
      />

      {/* Create / Edit Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? 'Edit Reordering Rule' : 'New Reordering Rule'}
        subtitle="Establish automatic stock replenishment boundaries."
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={submitting}>
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            options={products.map(p => ({
              value: p.id,
              label: `${p.name} (${p.sku})`
            }))}
            disabled={Boolean(editingRule)}
            error={errors.productId}
            required
          />

          <Select
            label="Warehouse Facility"
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            options={warehouses.map(w => ({
              value: w.id,
              label: `${w.name} (${w.code})`
            }))}
            disabled={Boolean(editingRule)}
            error={errors.warehouseId}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Quantity"
              type="number"
              min="0"
              value={minQty}
              onChange={(e) => setMinQty(Number(e.target.value))}
              helperText="Alerts trigger when stock falls below this level."
              error={errors.minQty}
              required
            />

            <Input
              label="Preferred / Target Quantity"
              type="number"
              min="1"
              value={preferredQty}
              onChange={(e) => setPreferredQty(Number(e.target.value))}
              helperText="Replenishment order fills stock up to this target."
              error={errors.preferredQty}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Delete Rule Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingRule)}
        onClose={() => setDeletingRule(null)}
        onConfirm={handleDelete}
        title="Delete Reordering Rule"
        message={`Are you sure you want to delete the reordering rule for '${deletingRule?.productName}' at '${deletingRule?.warehouseName}'?`}
        confirmText="Delete Rule"
        variant="danger"
      />
    </div>
  );
};
