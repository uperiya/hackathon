import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Calendar,
  Layers,
  MapPin,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Adjustment, Product, Warehouse, Location } from '../../types';
import { getCollectionData, setDocumentData } from '../../lib/storage';
import { adjustStock, getStockBalance } from '../../services/stockEngine';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { generateDocNumber, formatDate } from '../../lib/utils';

export const AdjustmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Adjustment fields
  const [adjustmentNumber, setAdjustmentNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [systemQuantity, setSystemQuantity] = useState(0);
  const [physicalQuantity, setPhysicalQuantity] = useState(0);
  const [reason, setReason] = useState('Routine Physical Cycle Count');
  const [notes, setNotes] = useState('');

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [prods, whs, locs] = await Promise.all([
        getCollectionData<Product>('products'),
        getCollectionData<Warehouse>('warehouses'),
        getCollectionData<Location>('locations')
      ]);

      setProducts(prods);
      setWarehouses(whs);
      setLocations(locs);

      setAdjustmentNumber(generateDocNumber('ADJ'));

      const initialProd = prods[0];
      const initialWh = whs[0];
      const initialLocs = locs.filter(l => l.warehouseId === initialWh?.id);
      const initialLoc = initialLocs[0];

      if (initialProd) setProductId(initialProd.id);
      if (initialWh) setWarehouseId(initialWh.id);
      if (initialLoc) setLocationId(initialLoc.id);

      if (initialProd && initialLoc) {
        const bal = await getStockBalance(initialProd.id, initialLoc.id);
        const qty = bal ? bal.quantity : 0;
        setSystemQuantity(qty);
        setPhysicalQuantity(qty);
      }

      setLoading(false);
    };

    init();
  }, []);

  const availableLocations = locations.filter(l => l.warehouseId === warehouseId);
  const selectedProduct = products.find(p => p.id === productId);

  // Re-fetch system quantity whenever product or location changes
  useEffect(() => {
    if (!productId || !locationId || loading) return;

    const fetchSystemBalance = async () => {
      const bal = await getStockBalance(productId, locationId);
      const qty = bal ? bal.quantity : 0;
      setSystemQuantity(qty);
      setPhysicalQuantity(qty);
    };

    fetchSystemBalance();
  }, [productId, locationId, loading]);

  // Compute discrepancy
  const difference = Number(physicalQuantity) - Number(systemQuantity);

  const handleValidateAndPost = async () => {
    if (!user) return;
    if (!reason.trim()) {
      showToast('error', 'Please provide a justification reason for this stock adjustment.');
      return;
    }

    setSubmitting(true);
    try {
      const wh = warehouses.find(w => w.id === warehouseId);
      const loc = locations.find(l => l.id === locationId);
      const prod = products.find(p => p.id === productId);

      if (!prod || !wh || !loc) throw new Error('Invalid product, warehouse or location.');

      const docId = `adj_${Date.now()}`;
      const payload: Adjustment = {
        id: docId,
        adjustmentNumber,
        date: new Date(date).toISOString(),
        warehouseId,
        warehouseName: wh.name,
        locationId,
        locationName: loc.name,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        unitOfMeasure: prod.unitOfMeasure,
        systemQuantity: Number(systemQuantity),
        physicalQuantity: Number(physicalQuantity),
        difference,
        reason: reason.trim(),
        notes: notes.trim(),
        status: 'Draft',
        createdBy: user.id,
        createdByName: user.name,
        createdAt: new Date().toISOString()
      };

      await setDocumentData('adjustments', docId, payload);

      // Execute atomic adjustment engine
      const result = await adjustStock(docId, user);

      setConfirmModalOpen(false);
      showToast('success', result.message);
      navigate('/operations/adjustments');
    } catch (err: any) {
      showToast('error', err.message || 'Stock adjustment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/operations/adjustments')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Adjustments
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-8">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Inventory Physical Count (Stock Count)
            </span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {adjustmentNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Recorded by {user?.name} on {formatDate(date, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        {/* Target Stock Item Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Select
            label="Product to Count"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
            required
          />

          <Select
            label="Warehouse"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              const matching = locations.filter(l => l.warehouseId === e.target.value);
              if (matching[0]) setLocationId(matching[0].id);
            }}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            required
          />

          <Select
            label="Location / Rack"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={availableLocations.map(l => ({ value: l.id, label: l.name }))}
            required
          />
        </div>

        {/* Count Reconciliation Box */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">
            Quantity Reconciliation Matrix
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {/* System Qty */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase">System Recorded</span>
              <p className="text-3xl font-mono font-black text-slate-800 dark:text-slate-100 mt-1">
                {systemQuantity}
              </p>
              <span className="text-xs text-slate-500 font-medium">{selectedProduct?.unitOfMeasure}</span>
            </div>

            {/* Physical Count Input */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border-2 border-indigo-500/30 text-center shadow-md">
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                Physical Hand Count
              </span>
              <div className="mt-1 flex items-center justify-center">
                <input
                  type="number"
                  min="0"
                  value={physicalQuantity}
                  onChange={(e) => setPhysicalQuantity(Number(e.target.value))}
                  className="w-32 text-center text-3xl font-mono font-black border-0 bg-transparent text-slate-900 dark:text-white focus:ring-0"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">{selectedProduct?.unitOfMeasure}</span>
            </div>

            {/* Difference Calculation */}
            <div className={`p-4 rounded-xl text-center border ${
              difference > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                : difference < 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Variance (Difference)
              </span>
              <p className="text-3xl font-mono font-black mt-1">
                {difference > 0 ? `+${difference}` : difference}
              </p>
              <span className="text-xs font-semibold">
                {difference === 0 ? 'Exact Match' : difference > 0 ? 'Surplus (+IN)' : 'Deficit (-OUT)'}
              </span>
            </div>
          </div>
        </div>

        {/* Reason & Audit Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            label="Audit Discrepancy Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={[
              { value: 'Routine Physical Cycle Count', label: 'Routine Physical Cycle Count' },
              { value: 'Damaged materials during forklift handling', label: 'Damaged materials during forklift handling' },
              { value: 'Packaging breakage / leakage', label: 'Packaging breakage / leakage' },
              { value: 'Theft / Unaccounted shortage', label: 'Theft / Unaccounted shortage' },
              { value: 'Found unrecorded stock in back rack', label: 'Found unrecorded stock in back rack' },
              { value: 'Vendor miscount discrepancy', label: 'Vendor miscount discrepancy' },
            ]}
            required
          />

          <Input
            label="Count Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Detailed Auditor Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document physical counting methodology, barcode scan IDs, or QC disposal approval..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-xs focus:ring-2 focus:ring-[#714B67]/30"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            onClick={() => navigate('/operations/adjustments')}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={() => setConfirmModalOpen(true)}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Validate & Post Adjustment
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleValidateAndPost}
        title="Post Stock Adjustment"
        message={`This will permanently update system inventory for '${selectedProduct?.name}' at '${locations.find(l => l.id === locationId)?.name}' to ${physicalQuantity} units (variance: ${difference > 0 ? '+' : ''}${difference}). This adjustment is immutable once posted. Proceed?`}
        variant={difference < 0 ? 'danger' : 'primary'}
        confirmText="Confirm & Post"
        loading={submitting}
      />
    </div>
  );
};
