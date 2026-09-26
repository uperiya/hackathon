import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Category, Product } from '../../types';
import { categoriesService } from '../../services/categoriesService';
import { productsService } from '../../services/productsService';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { SearchBar } from '../../components/common/SearchBar';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const Categories: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Deletion guard state
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [activeUsageCount, setActiveUsageCount] = useState<number>(0);

  useEffect(() => {
    const unsubCats = categoriesService.subscribe((data) => {
      setCategories(data);
      setLoading(false);
    });
    const unsubProds = productsService.subscribe(setProducts);

    return () => {
      unsubCats();
      unsubProds();
    };
  }, []);

  const openCreate = () => {
    setCategoryToEdit(null);
    setName('');
    setDescription('');
    setActive(true);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setCategoryToEdit(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setActive(cat.active);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Category name is required.' });
      return;
    }

    setSubmitting(true);
    try {
      if (categoryToEdit) {
        await categoriesService.update(categoryToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          active
        });
        showToast('success', `Category '${name}' updated successfully.`);
      } else {
        await categoriesService.create({
          name: name.trim(),
          description: description.trim(),
          active
        });
        showToast('success', `Category '${name}' created successfully.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const checkDelete = (cat: Category) => {
    const count = products.filter(p => p.categoryId === cat.id).length;
    setActiveUsageCount(count);
    setDeletingCat(cat);
  };

  const handleConfirmDeleteOrDeactivate = async () => {
    if (!deletingCat) return;

    try {
      if (activeUsageCount > 0) {
        // Safe deactivation instead of deletion to prevent orphaned products
        await categoriesService.update(deletingCat.id, { active: false });
        showToast('info', `Category '${deletingCat.name}' is referenced by ${activeUsageCount} products and was safely deactivated instead of deleted.`);
      } else {
        await categoriesService.delete(deletingCat.id);
        showToast('success', `Category '${deletingCat.name}' deleted.`);
      }
      setDeletingCat(null);
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed');
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchDesc = (c.description || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      if (statusFilter === 'active' && !c.active) return false;
      if (statusFilter === 'inactive' && c.active) return false;

      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#714B67] dark:text-purple-300">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">{c.name}</span>
            <span className="text-[11px] text-slate-500 line-clamp-1">{c.description || 'No description'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'productCount',
      header: 'Assigned Products',
      align: 'center',
      render: (c) => {
        const count = products.filter(p => p.categoryId === c.id).length;
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {count} items
          </span>
        );
      }
    },
    {
      key: 'active',
      header: 'Status',
      render: (c) => <StatusBadge status={c.active ? 'Active' : 'Inactive'} size="sm" />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(c)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#714B67] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
            title="Edit Category"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => checkDelete(c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            title="Delete / Deactivate"
          >
            <Trash2 className="w-4 h-4" />
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
            <Layers className="w-6 h-6 text-[#714B67]" />
            <span>Product Categories</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize catalog inventory into functional classifications and billing groups.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          New Category
        </Button>
      </div>

      {/* Search & Active/Inactive Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search categories by name or description..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-md transition ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active ({categories.filter(c => c.active).length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-md transition ${
              statusFilter === 'inactive'
                ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Inactive ({categories.filter(c => !c.active).length})
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <DataTable
        columns={columns}
        data={filteredCategories}
        loading={loading}
        pageSize={10}
        emptyTitle="No categories found"
        emptyDescription={searchQuery ? 'No categories match your search filters.' : 'Create your first inventory category to organize products.'}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={categoryToEdit ? 'Edit Category' : 'Create Category'}
        subtitle="Manage category metadata and status."
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={submitting}>
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Raw Materials"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a description for products filed under this category..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-[#714B67]/30 focus:border-[#714B67]"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="cat-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67]"
            />
            <label htmlFor="cat-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
              Active Category (available for new products)
            </label>
          </div>
        </form>
      </Modal>

      {/* Deletion / Deactivation Protection Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingCat)}
        onClose={() => setDeletingCat(null)}
        onConfirm={handleConfirmDeleteOrDeactivate}
        title={activeUsageCount > 0 ? "Safely Deactivate Category" : "Delete Category"}
        message={
          activeUsageCount > 0
            ? `Category '${deletingCat?.name}' is currently linked to ${activeUsageCount} products in your catalog. To prevent orphan data, this category will be marked Inactive rather than permanently deleted.`
            : `Are you sure you want to permanently delete category '${deletingCat?.name}'? This action cannot be undone.`
        }
        confirmText={activeUsageCount > 0 ? "Deactivate Safely" : "Delete Category"}
        variant={activeUsageCount > 0 ? "primary" : "danger"}
      />
    </div>
  );
};
