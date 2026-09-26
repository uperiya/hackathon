import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Printer,
  Plus,
  Trash2,
  Building,
  MapPin,
  Calendar,
  Truck,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Receipt, ReceiptItem, Product, Warehouse, Location } from '../../types';
import { getDocumentData, getCollectionData, setDocumentData, updateDocumentData } from '../../lib/storage';
import { receiveStock } from '../../services/stockEngine';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBarPipeline } from '../../components/common/StatusBarPipeline';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { generateDocNumber, formatDate } from '../../lib/utils';

export const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotification();

  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(!isNew);
  const [validating, setValidating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Receipt form fields
  const [receiptNumber, setReceiptNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Receipt['status']>('Draft');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [receiptRecord, setReceiptRecord] = useState<Receipt | null>(null);

  // Confirm dialogs
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Load masters & document
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
        setReceiptNumber(generateDocNumber('REC'));
        setSupplier('');
        setDate(new Date().toISOString().split('T')[0]);
        setStatus('Draft');

        const defaultWh = whs[0]?.id || '';
        setDestWarehouseId(defaultWh);
        const matchingLocs = locs.filter(l => l.warehouseId === defaultWh);
        setDestLocationId(matchingLocs[0]?.id || '');

        // Check if pre-populated from Reordering Rules
        const preProdId = searchParams.get('productId');
        const preQty = Number(searchParams.get('suggestedQty')) || 10;

        if (preProdId) {
          const preProd = prods.find(p => p.id === preProdId);
          if (preProd) {
            setItems([{
              productId: preProd.id,
              productName: preProd.name,
              sku: preProd.sku,
              quantity: preQty,
              unitOfMeasure: preProd.unitOfMeasure
            }]);
          }
        } else if (prods.length > 0) {
          setItems([{
            productId: prods[0].id,
            productName: prods[0].name,
            sku: prods[0].sku,
            quantity: 10,
            unitOfMeasure: prods[0].unitOfMeasure
          }]);
        }

        setLoading(false);
      } else {
        const doc = await getDocumentData<Receipt>('receipts', id);
        if (doc) {
          setReceiptRecord(doc);
          setReceiptNumber(doc.receiptNumber);
          setSupplier(doc.supplier);
          setDate(doc.date.split('T')[0]);
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
  }, [id, isNew, searchParams]);

  const availableLocations = locations.filter(l => l.warehouseId === destWarehouseId);

  // Update item selection
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
        quantity: 10,
        unitOfMeasure: prod.unitOfMeasure
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!supplier.trim()) {
      showToast('error', 'Supplier name is required.');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Receipt must contain at least one item.');
      return;
    }

    const wh = warehouses.find(w => w.id === destWarehouseId);
    const loc = locations.find(l => l.id === destLocationId);

    const docId = isNew ? `rec_${Date.now()}` : id!;
    const payload: Receipt = {
      id: docId,
      receiptNumber,
      supplier: supplier.trim(),
      date: new Date(date).toISOString(),
      destinationWarehouseId: destWarehouseId,
      destinationWarehouseName: wh?.name || 'Main Warehouse',
      destinationLocationId: destLocationId,
      destinationLocationName: loc?.name || 'Default Location',
      notes: notes.trim(),
      status: status === 'Done' ? 'Done' : 'Draft',
      items,
      createdBy: user?.id || 'admin',
      createdByName: user?.name || 'Administrator',
      createdAt: receiptRecord?.createdAt || new Date().toISOString(),
    };

    await setDocumentData('receipts', docId, payload);
    showToast('success', `Receipt ${receiptNumber} saved as Draft.`);
    if (isNew) {
      navigate(`/operations/receipts/${docId}`, { replace: true });
    }
  };

  // Validate Receipt via Critical Stock Engine
  const handleValidate = async () => {
    if (!user) return;
    setValidating(true);

    try {
      // First ensure latest draft changes are saved
      const wh = warehouses.find(w => w.id === destWarehouseId);
      const loc = locations.find(l => l.id === destLocationId);
      const docId = isNew ? `rec_${Date.now()}` : id!;

      const payload: Receipt = {
        id: docId,
        receiptNumber,
        supplier: supplier.trim(),
        date: new Date(date).toISOString(),
        destinationWarehouseId: destWarehouseId,
        destinationWarehouseName: wh?.name || 'Main Warehouse',
        destinationLocationId: destLocationId,
        destinationLocationName: loc?.name || 'Default Location',
        notes: notes.trim(),
        status: 'Draft',
        items,
        createdBy: user?.id || 'admin',
        createdByName: user?.name || 'Administrator',
        createdAt: receiptRecord?.createdAt || new Date().toISOString(),
      };
      await setDocumentData('receipts', docId, payload);

      // Execute atomic stock receipt through critical stock service
      const result = await receiveStock(docId, user);

      setStatus('Done');
      setConfirmValidateOpen(false);
      showToast('success', result.message);

      if (isNew) {
        navigate(`/operations/receipts/${docId}`, { replace: true });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  // Cancel Receipt
  const handleCancel = async () => {
    if (!id || isNew) return;
    try {
      await updateDocumentData('receipts', id, { status: 'Canceled' });
      setStatus('Canceled');
      setConfirmCancelOpen(false);
      showToast('info', `Receipt ${receiptNumber} has been marked as Canceled.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel receipt');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#017E84] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDone = status === 'Done';
  const isCanceled = status === 'Canceled';
  const isReadOnly = isDone || isCanceled;

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Action Bar & Odoo Status Pipeline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/receipts')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Receipts
          </Button>

          {!isReadOnly && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => setConfirmValidateOpen(true)}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate
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

        {/* Odoo Status Pipeline */}
        <div>
          <StatusBarPipeline currentStatus={status} stages={['Draft', 'Ready', 'Done']} />
        </div>
      </div>

      {/* Main ERP Receipt Sheet */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-8">
        {/* Document Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#017E84] dark:text-teal-400">
              Goods Receipt Note (GRN)
            </span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {receiptNumber}
            </h1>
            {isDone && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Validated into inventory on {formatDate(receiptRecord?.validatedAt || new Date().toISOString())}
              </p>
            )}
          </div>

          <div className="text-right text-xs text-slate-500">
            <p>Created by: <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptRecord?.createdByName || user?.name}</span></p>
            <p className="mt-0.5">Date: {formatDate(date, 'MMM dd, yyyy')}</p>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label="Supplier / Vendor"
            placeholder="e.g. Apex Steel Industries Inc."
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            disabled={isReadOnly}
            leftIcon={<Truck className="w-4 h-4" />}
            required
          />

          <Input
            label="Scheduled Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isReadOnly}
            leftIcon={<Calendar className="w-4 h-4" />}
            required
          />

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
            required
          />

          <Select
            label="Destination Location / Rack"
            value={destLocationId}
            onChange={(e) => setDestLocationId(e.target.value)}
            disabled={isReadOnly}
            options={availableLocations.map(l => ({ value: l.id, label: l.name }))}
            required
          />
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Received Product Lines
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
                  <th className="py-3 px-4 text-right">Quantity</th>
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

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Notes / Carrier Tracking
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            placeholder="Add delivery bills, container numbers, or freight carrier info..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-xs focus:ring-2 focus:ring-[#714B67]/30"
          />
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Validate Goods Receipt"
        message="Validating this receipt will immediately increase stock quantities in the destination warehouse and write immutable audit entries to the Stock Ledger. Continue?"
        variant="primary"
        confirmText="Validate & Post Stock"
        loading={validating}
      />

      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Receipt"
        message="Are you sure you want to mark this incoming receipt as Canceled?"
        variant="danger"
        confirmText="Yes, Cancel"
      />
    </div>
  );
};
