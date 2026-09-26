import React, { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, MapPin, Layers, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, Location } from '../../types';
import { warehousesService } from '../../services/warehousesService';
import { locationsService } from '../../services/locationsService';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const WarehousesSetting: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Warehouse Modal
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whActive, setWhActive] = useState(true);
  const [submittingWh, setSubmittingWh] = useState(false);

  // Quick Add Location Modal
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [targetWarehouseForLoc, setTargetWarehouseForLoc] = useState<Warehouse | null>(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [submittingLoc, setSubmittingLoc] = useState(false);

  // Delete confirms
  const [deletingWh, setDeletingWh] = useState<Warehouse | null>(null);
  const [deletingLoc, setDeletingLoc] = useState<Location | null>(null);

  useEffect(() => {
    const unsubWhs = warehousesService.subscribe((data) => {
      setWarehouses(data);
      setLoading(false);
    });
    const unsubLocs = locationsService.subscribe(setLocations);

    return () => {
      unsubWhs();
      unsubLocs();
    };
  }, []);

  const openCreateWh = () => {
    setEditingWh(null);
    setWhName('');
    setWhCode('');
    setWhAddress('');
    setWhActive(true);
    setIsWhModalOpen(true);
  };

  const openEditWh = (wh: Warehouse) => {
    setEditingWh(wh);
    setWhName(wh.name);
    setWhCode(wh.code);
    setWhAddress(wh.address);
    setWhActive(wh.active);
    setIsWhModalOpen(true);
  };

  const handleSaveWh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) {
      showToast('error', 'Warehouse name and code are required.');
      return;
    }

    setSubmittingWh(true);
    try {
      if (editingWh) {
        await warehousesService.update(editingWh.id, {
          name: whName.trim(),
          code: whCode.trim().toUpperCase(),
          address: whAddress.trim(),
          active: whActive
        });
        showToast('success', `Warehouse '${whName}' updated.`);
      } else {
        const newWh = await warehousesService.create({
          name: whName.trim(),
          code: whCode.trim().toUpperCase(),
          address: whAddress.trim(),
          active: whActive
        });

        // Auto create a default storage bay for convenience
        await locationsService.create({
          warehouseId: newWh.id,
          warehouseName: newWh.name,
          name: 'General Storage Bay',
          code: `${newWh.code}/GEN`,
          active: true
        });

        showToast('success', `Warehouse '${whName}' created with default storage bay.`);
      }
      setIsWhModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save warehouse');
    } finally {
      setSubmittingWh(false);
    }
  };

  const handleDeleteWh = async () => {
    if (!deletingWh) return;
    try {
      await warehousesService.delete(deletingWh.id);
      showToast('success', `Warehouse '${deletingWh.name}' removed.`);
      setDeletingWh(null);
    } catch (err: any) {
      showToast('error', err.message || 'Cannot delete warehouse with active locations or stock.');
    }
  };

  const openQuickAddLoc = (wh: Warehouse) => {
    setTargetWarehouseForLoc(wh);
    setLocName('');
    setLocCode(`${wh.code}/`);
    setIsLocModalOpen(true);
  };

  const handleSaveQuickLoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWarehouseForLoc || !locName.trim() || !locCode.trim()) {
      showToast('error', 'Location name and code are required.');
      return;
    }

    setSubmittingLoc(true);
    try {
      await locationsService.create({
        warehouseId: targetWarehouseForLoc.id,
        warehouseName: targetWarehouseForLoc.name,
        name: locName.trim(),
        code: locCode.trim().toUpperCase(),
        active: true
      });
      showToast('success', `Storage rack '${locName}' added to ${targetWarehouseForLoc.name}.`);
      setIsLocModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add location');
    } finally {
      setSubmittingLoc(false);
    }
  };

  const handleDeleteLoc = async () => {
    if (!deletingLoc) return;
    try {
      await locationsService.delete(deletingLoc.id);
      showToast('success', `Location '${deletingLoc.name}' deleted.`);
      setDeletingLoc(null);
    } catch (err: any) {
      showToast('error', err.message || 'Cannot delete location with active inventory.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-[#714B67]" />
            <span>Warehouses & Locations Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure distribution plants, storage facilities, and internal racking systems.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings/locations')}
            icon={<MapPin className="w-3.5 h-3.5 text-teal-600" />}
          >
            All Locations Table
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateWh}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Warehouse
          </Button>
        </div>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map((wh) => {
          const whLocs = locations.filter(l => l.warehouseId === wh.id);

          return (
            <div
              key={wh.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {/* Warehouse Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-[#714B67] dark:text-purple-300 rounded-xl">
                    <WarehouseIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {wh.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {wh.code}
                      </span>
                      <StatusBadge status={wh.active ? 'Active' : 'Inactive'} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditWh(wh)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#714B67] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                    title="Edit Warehouse"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingWh(wh)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete Warehouse"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Warehouse Address */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {wh.address || 'No physical address specified'}
              </p>

              {/* Locations Management Section inside Warehouse Card */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Storage Racks & Bays ({whLocs.length}):
                  </p>
                  <button
                    onClick={() => openQuickAddLoc(wh)}
                    className="text-xs font-semibold text-[#017E84] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Location
                  </button>
                </div>

                {whLocs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No storage locations configured in this facility.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {whLocs.map(loc => (
                      <div
                        key={loc.id}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs group"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{loc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{loc.code}</span>
                          <button
                            onClick={() => setDeletingLoc(loc)}
                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                            title="Delete location"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warehouse Modal */}
      <Modal
        isOpen={isWhModalOpen}
        onClose={() => setIsWhModalOpen(false)}
        title={editingWh ? 'Edit Warehouse' : 'New Warehouse Facility'}
        subtitle="Manage logistics plant location and code."
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsWhModalOpen(false)} disabled={submittingWh}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveWh} loading={submittingWh}>
              {editingWh ? 'Save Changes' : 'Create Facility'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveWh} className="space-y-4">
          <Input
            label="Warehouse Name"
            placeholder="e.g. Central Distribution Hub"
            value={whName}
            onChange={(e) => setWhName(e.target.value)}
            required
          />

          <Input
            label="Facility Code"
            placeholder="e.g. WH-CENTRAL"
            value={whCode}
            onChange={(e) => setWhCode(e.target.value)}
            helperText="Used as prefix in location rack codes"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Physical Address
            </label>
            <textarea
              rows={3}
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="Full physical logistics address..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-[#714B67]/30 focus:border-[#714B67]"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="wh-active"
              checked={whActive}
              onChange={(e) => setWhActive(e.target.checked)}
              className="w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67]"
            />
            <label htmlFor="wh-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Active Facility (available for stock receipts and deliveries)
            </label>
          </div>
        </form>
      </Modal>

      {/* Quick Add Location Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title={`Add Storage Rack to ${targetWarehouseForLoc?.name}`}
        subtitle="Define an internal storage bay or racking bin."
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsLocModalOpen(false)} disabled={submittingLoc}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveQuickLoc} loading={submittingLoc}>
              Add Rack
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveQuickLoc} className="space-y-4">
          <Input
            label="Location / Rack Name"
            placeholder="e.g. Rack D - Heavy Storage"
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
            required
          />

          <Input
            label="Location Code"
            placeholder="e.g. WH-MAIN/RACK-D"
            value={locCode}
            onChange={(e) => setLocCode(e.target.value)}
            helperText="Unique bin/bay identifier"
            required
          />
        </form>
      </Modal>

      {/* Delete Warehouse Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingWh)}
        onClose={() => setDeletingWh(null)}
        onConfirm={handleDeleteWh}
        title="Delete Warehouse Facility"
        message={`Are you sure you want to delete '${deletingWh?.name}'? Warehouses with active storage locations or stock balances cannot be removed.`}
        confirmText="Delete Facility"
        variant="danger"
      />

      {/* Delete Location Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingLoc)}
        onClose={() => setDeletingLoc(null)}
        onConfirm={handleDeleteLoc}
        title="Delete Storage Location"
        message={`Are you sure you want to delete '${deletingLoc?.name}' (${deletingLoc?.code})? Locations with inventory units cannot be deleted.`}
        confirmText="Delete Location"
        variant="danger"
      />
    </div>
  );
};
