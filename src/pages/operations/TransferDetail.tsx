import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  Trash2,
  Calendar,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Transfer, TransferItem, Product, Warehouse, Location } from '../../types';
import { getDocumentData, getCollectionData, setDocumentData, updateDocumentData } from '../../lib/storage';
import { transferStock, getStockBalance } from '../../services/stockEngine';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBarPipeline } from '../../components/common/StatusBarPipeline';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { generateDocNumber, formatDate } from '../../lib/utils';

export const TransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotification();

  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(!isNew);
  const [validating, setValidating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Transfer fields
  const [transferNumber, setTransferNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Transfer['status']>('Draft');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [transferRecord, setTransferRecord] = useState<Transfer | null>(null);

  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

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

      if (isNew) {
        setTransferNumber(generateDocNumber('TRF'));
        setDate(new Date().toISOString().split('T')[0]);
        setStatus('Draft');

        const wh1 = whs[0]?.id || '';
        const wh2 = whs[1]?.id || whs[0]?.id || '';
        setSourceWarehouseId(wh1);
        setDestWarehouseId(wh2);

        const srcLocs = locs.filter(l => l.warehouseId === wh1);
        const destLocs = locs.filter(l => l.warehouseId === wh2);
        setSourceLocationId(srcLocs[0]?.id || '');
        setDestLocationId(destLocs[0]?.id || '');

        if (prods.length > 0) {
          setItems([{
            productId: prods[0].id,
            productName: prods[0].name,
            sku: prods[0].sku,
            quantity: 5,
            unitOfMeasure: prods[0].unitOfMeasure
          }]);
        }
        setLoading(false);
      } else {
        const doc = await getDocumentData<Transfer>('transfers', id);
        if (doc) {
          setTransferRecord(doc);
          setTransferNumber(doc.transferNumber);
          setDate(doc.date.split('T')[0]);
          setSourceWarehouseId(doc.sourceWarehouseId);
          setSourceLocationId(doc.sourceLocationId);
          setDestWarehouseId(doc.destinationWarehouseId);
          setDestLocationId(doc.destinationLocationId);
          setNotes(doc.notes || '');
          setStatus(doc.status);
          setItems(doc.items || []);
        }
        setLoading(false);
      }
    };

    init();
  }, [id, isNew]);

  const sourceLocations = locations.filter(l => l.warehouseId === sourceWarehouseId);
  const destLocations = locations.filter(l => l.warehouseId === destWarehouseId);

  const handleItemProductChange = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        unitOfMeasure: prod.unitOfMeasure
      };
      return copy;
    });
  };

  const handleItemQuantityChange = (index: number, qty: number) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: Math.max(1, qty) };
      return copy;
    });
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    const prod = products[0];
    setItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: 5,
        unitOfMeasure: prod.unitOfMeasure
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveDraft = async () => {
    const srcWh = warehouses.find(w => w.id === sourceWarehouseId);
    const srcLoc = locations.find(l => l.id === sourceLocationId);
    const dstWh = warehouses.find(w => w.id === destWarehouseId);
    const dstLoc = locations.find(l => l.id === destLocationId);

    const docId = isNew ? `trf_${Date.now()}` : id!;

    const payload: Transfer = {
      id: docId,
      transferNumber,
      date: new Date(date).toISOString(),
      sourceWarehouseId,
      sourceWarehouseName: srcWh?.name || 'Main Warehouse',
      sourceLocationId,
      sourceLocationName: srcLoc?.name || 'Source Location',
      destinationWarehouseId: destWarehouseId,
      destinationWarehouseName: dstWh?.name || 'Production Warehouse',
      destinationLocationId: destLocationId,
      destinationLocationName: dstLoc?.name || 'Destination Location',
      notes: notes.trim(),
      status: status === 'Done' ? 'Done' : 'Draft',
      items,
      createdBy: user?.id || 'admin',
      createdByName: user?.name || 'Administrator',
      createdAt: transferRecord?.createdAt || new Date().toISOString()
    };

    await setDocumentData('transfers', docId, payload);
    showToast('success', `Transfer ${transferNumber} saved.`);
    if (isNew) {
      navigate(`/operations/transfers/${docId}`, { replace: true });
    }
  };

  const handleValidate = async () => {
    if (!user) return;

    if (sourceLocationId === destLocationId) {
      showToast('error', 'Source and destination locations cannot be identical.');
      return;
    }

    setValidating(true);
    try {
      const srcWh = warehouses.find(w => w.id === sourceWarehouseId);
      const srcLoc = locations.find(l => l.id === sourceLocationId);
      const dstWh = warehouses.find(w => w.id === destWarehouseId);
      const dstLoc = locations.find(l => l.id === destLocationId);
      const docId = isNew ? `trf_${Date.now()}` : id!;

      const payload: Transfer = {
        id: docId,
        transferNumber,
        date: new Date(date).toISOString(),
        sourceWarehouseId,
        sourceWarehouseName: srcWh?.name || 'Main Warehouse',
        sourceLocationId,
        sourceLocationName: srcLoc?.name || 'Source Location',
        destinationWarehouseId: destWarehouseId,
        destinationWarehouseName: dstWh?.name || 'Production Warehouse',
        destinationLocationId: destLocationId,
        destinationLocationName: dstLoc?.name || 'Destination Location',
        notes: notes.trim(),
        status: 'Ready',
        items,
        createdBy: user?.id || 'admin',
        createdByName: user?.name || 'Administrator',
        createdAt: transferRecord?.createdAt || new Date().toISOString()
      };
      await setDocumentData('transfers', docId, payload);

      const result = await transferStock(docId, user);

      setStatus('Done');
      setConfirmValidateOpen(false);
      showToast('success', result.message);

      if (isNew) {
        navigate(`/operations/transfers/${docId}`, { replace: true });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Transfer failed.');
    } finally {
      setValidating(false);
    }
  };

  const handleCancel = async () => {
    if (!id || isNew) return;
    try {
      await updateDocumentData('transfers', id, { status: 'Canceled' });
      setStatus('Canceled');
      setConfirmCancelOpen(false);
      showToast('info', `Transfer ${transferNumber} marked Canceled.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel transfer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDone = status === 'Done';
  const isCanceled = status === 'Canceled';
  const isReadOnly = isDone || isCanceled;

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/transfers')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Transfers
          </Button>

          {!isReadOnly && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmValidateOpen(true)}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate Transfer
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
              >
                Save Draft
              </Button>
            </>
          )}

          {!isNew && !isReadOnly && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmCancelOpen(true)}
            >
              Cancel
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>
        </div>

        <div>
          <StatusBarPipeline currentStatus={status} stages={['Draft', 'Ready', 'Done']} />
        </div>
      </div>

      {/* Main Transfer Sheet */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-8">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Internal Stock Transfer (IST)
            </span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {transferNumber}
            </h1>
            {isDone && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed and logged to stock ledger on {formatDate(transferRecord?.validatedAt || new Date().toISOString())}
              </p>
            )}
          </div>

          <div className="text-right text-xs text-slate-500">
            <p>Initiated by: <span className="font-semibold text-slate-800 dark:text-slate-200">{transferRecord?.createdByName || user?.name}</span></p>
            <p className="mt-0.5">Date: {formatDate(date, 'MMM dd, yyyy')}</p>
          </div>
        </div>

        {/* Source vs Destination Location Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* Source Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Source (From)</span>
            </div>

            <Select
              label="Source Warehouse"
              value={sourceWarehouseId}
              onChange={(e) => {
                setSourceWarehouseId(e.target.value);
                const matching = locations.filter(l => l.warehouseId === e.target.value);
                if (matching[0]) setSourceLocationId(matching[0].id);
              }}
              disabled={isReadOnly}
              options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            />

            <Select
              label="Source Rack / Location"
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              disabled={isReadOnly}
              options={sourceLocations.map(l => ({ value: l.id, label: l.name }))}
            />
          </div>

          {/* Destination Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Destination (To)</span>
            </div>

            <Select
              label="Destination Warehouse"
              value={destWarehouseId}
              onChange={(e) => {
                setDestWarehouseId(e.target.value);
                const matching = locations.filter(l => l.warehouseId === e.target.value);
                if (matching[0]) setDestLocationId(matching[0].id);
              }}
              disabled={isReadOnly}
              options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            />

            <Select
              label="Destination Rack / Location"
              value={destLocationId}
              onChange={(e) => setDestLocationId(e.target.value)}
              disabled={isReadOnly}
              options={destLocations.map(l => ({ value: l.id, label: l.name }))}
            />
          </div>
        </div>

        {/* Product Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Items to Relocate
            </h3>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={addItemRow}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line
              </Button>
            )}
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-right">Transfer Quantity</th>
                  <th className="py-3 px-4">Unit</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      {isReadOnly ? (
                        <span className="font-semibold text-slate-900 dark:text-white">{item.productName}</span>
                      ) : (
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-[#714B67]"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{item.sku}</td>
                    <td className="py-3 px-4 text-right">
                      {isReadOnly ? (
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{item.quantity}</span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                          className="w-24 text-right py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.unitOfMeasure}</td>
                    {!isReadOnly && (
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Transfer Purpose & Internal Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            placeholder="e.g. Relocating steel inventory from Main WH to Production floor assembly lines..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-xs focus:ring-2 focus:ring-[#714B67]/30"
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Execute Internal Transfer"
        message="Validating will deduct stock from source rack, credit destination rack, and log the movement in the Stock Ledger. Company overall quantity will remain unchanged. Proceed?"
        variant="primary"
        confirmText="Confirm & Relocate Stock"
        loading={validating}
      />

      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Transfer"
        message="Are you sure you want to cancel this transfer order?"
        variant="danger"
        confirmText="Yes, Cancel"
      />
    </div>
  );
};
