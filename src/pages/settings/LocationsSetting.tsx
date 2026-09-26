import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Plus, Edit2, Trash2, Building, Search, Filter } from 'lucide-react';
import { Location, Warehouse } from '../../types';
import { locationsService } from '../../services/locationsService';
import { warehousesService } from '../../services/warehousesService';
import { useNotification } from '../../context/NotificationContext';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const LocationsSetting: React.FC = () => {
  const { showToast } = useNotification();
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [deletingLoc, setDeletingLoc] = useState<Location | null>(null);

  useEffect(() => {
    const unsubLocs = locationsService.subscribe((data) => {
      setLocations(data);
      setLoading(false);
    });
    const unsubWhs = warehousesService.subscribe(setWarehouses);

    return () => {
      unsubLocs();
      unsubWhs();
    };
  }, []);

  const openCreate = () => {
    setEditingLoc(null);
    setWarehouseId(warehouses[0]?.id || '');
    setName('');
    setCode('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingLoc(loc);
    setWarehouseId(loc.warehouseId);
    setName(loc.name);
    setCode(loc.code);
    setActive(loc.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !warehouseId) {
      showToast('error', 'Please fill in all location fields.');
      return;
    }

    setSubmitting(true);
    try {
      const wh = warehouses.find(w => w.id === warehouseId);

      if (editingLoc) {
        await locationsService.update(editingLoc.id, {
          warehouseId,
          warehouseName: wh?.name || 'Warehouse',
          name: name.trim(),
          code: code.trim().toUpperCase(),
          active
        });
        showToast('success', `Location '${name}' updated.`);
      } else {
        await locationsService.create({
          warehouseId,
          warehouseName: wh?.name || 'Warehouse',
          name: name.trim(),
          code: code.trim().toUpperCase(),
          active
        });
        showToast('success', `Location '${name}' created.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLoc) return;
    try {
      await locationsService.delete(deletingLoc.id);
      showToast('success', `Location '${deletingLoc.name}' deleted.`);
      setDeletingLoc(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete location');
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = loc.name.toLowerCase().includes(q);
        const matchCode = loc.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }

      if (selectedWarehouseFilter && loc.warehouseId !== selectedWarehouseFilter) {
        return false;
      }

      return true;
    });
  }, [locations, searchQuery, selectedWarehouseFilter]);

  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Rack / Location',
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-600" />
          <span className="font-semibold text-slate-800 dark:text-slate-100">{l.name}</span>
        </div>
      )
    },
    {
      key: 'code',
      header: 'Barcode / Code',
      sortable: true,
      render: (l) => <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{l.code}</span>
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      sortable: true,
      render: (l) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {l.warehouseName || warehouses.find(w => w.id === l.warehouseId)?.name || 'General'}
        </span>
      )
    },
    {
      key: 'active',
      header: 'Status',
      render: (l) => <StatusBadge status={l.active ? 'Active' : 'Inactive'} size="sm" />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(l)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingLoc(l)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#714B67]" />
            <span>Locations & Storage Bins</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Internal storage racks, staging bays, and inspection bins mapped to warehouse facilities.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Location
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search locations by rack name or barcode..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            options={[
              { value: '', label: 'All Warehouses' },
              ...warehouses.map(w => ({ value: w.id, label: w.name }))
            ]}
            value={selectedWarehouseFilter}
            onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
            className="w-full sm:w-56 text-xs"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredLocations}
        loading={loading}
        pageSize={10}
        emptyTitle="No storage locations found"
        emptyDescription="Create storage racks and bays inside your warehouses."
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLoc ? 'Edit Location' : 'New Storage Rack / Location'}
        subtitle="Specify warehouse bin details and status."
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={submitting}>
              {editingLoc ? 'Save Changes' : 'Create Location'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Warehouse"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            required
          />

          <Input
            label="Location Name"
            placeholder="e.g. Rack A - Small Items"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Location Code"
            placeholder="e.g. WH-MAIN/RACK-A"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            helperText="Unique barcode or bin locator"
            required
          />

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="loc-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67]"
            />
            <label htmlFor="loc-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Active Storage Location
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingLoc)}
        onClose={() => setDeletingLoc(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Storage Location"
        message={`Are you sure you want to delete '${deletingLoc?.name}' (${deletingLoc?.code})? Locations with inventory units cannot be deleted.`}
        confirmText="Delete Location"
        variant="danger"
      />
    </div>
  );
};
