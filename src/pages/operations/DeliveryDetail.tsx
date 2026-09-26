import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  Trash2,
  Building,
  MapPin,
  Calendar,
  Users,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Delivery, DeliveryItem, Product, Warehouse, Location, StockBalance } from '../../types';
import { getDocumentData, getCollectionData, setDocumentData, updateDocumentData } from '../../lib/storage';
import { deliverStock, getStockBalance } from '../../services/stockEngine';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBarPipeline } from '../../components/common/StatusBarPipeline';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { generateDocNumber, formatDate } from '../../lib/utils';

export const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotification();

  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(!isNew);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [validating, setValidating] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Delivery fields
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Delivery['status']>('Draft');
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [deliveryRecord, setDeliveryRecord] = useState<Delivery | null>(null);

  // Stock check feedback
  const [availabilityMessage, setAvailabilityMessage] = useState<{
    type: 'success' | 'warning';
    text: string;
  } | null>(null);

  // Confirm dialogs
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
        setDeliveryNumber(generateDocNumber('DEL'));
        setCustomer('');
        setDate(new Date().toISOString().split('T')[0]);
        setStatus('Draft');

        const defaultWh = whs[0]?.id || '';
        setSourceWarehouseId(defaultWh);
        const matchingLocs = locs.filter(l => l.warehouseId === defaultWh);
        setSourceLocationId(matchingLocs[0]?.id || '');

        if (prods.length > 0) {
          setItems([{
            productId: prods[0].id,
            productName: prods[0].name,
            sku: prods[0].sku,
            quantity: 5,
            unitOfMeasure: prods[0].unitOfMeasure,
          }]);
        }
        setLoading(false);
      } else {
        const doc = await getDocumentData<Delivery>('deliveries', id);
        if (doc) {
          setDeliveryRecord(doc);
          setDeliveryNumber(doc.deliveryNumber);
          setCustomer(doc.customer);
          setDate(doc.date.split('T')[0]);
          setSourceWarehouseId(doc.sourceWarehouseId);
          setSourceLocationId(doc.sourceLocationId);
          setNotes(doc.notes || '');
          setStatus(doc.status);
          setItems(doc.items || []);
        }
        setLoading(false);
      }
    };

    init();
  }, [id, isNew]);

  const availableLocations = locations.filter(l => l.warehouseId === sourceWarehouseId);

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
    setAvailabilityMessage(null);
  };

  const handleItemQuantityChange = (index: number, qty: number) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: Math.max(1, qty) };
      return copy;
    });
    setAvailabilityMessage(null);
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
        quantity: 1,
        unitOfMeasure: prod.unitOfMeasure
      }
    ]);
    setAvailabilityMessage(null);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
    setAvailabilityMessage(null);
  };

  // Check Availability
  const handleCheckAvailability = async () => {
    if (!sourceLocationId) {
      showToast('error', 'Please select source location first.');
      return;
    }

    setCheckingAvailability(true);
    let allAvailable = true;
    let shortageMessage = '';

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      const bal = await getStockBalance(item.productId, sourceLocationId);
      const onHand = bal ? bal.quantity : 0;
      updatedItems[i].availableQuantity = onHand;

      if (onHand < item.quantity) {
        allAvailable = false;
        shortageMessage = `Insufficient stock for '${item.productName}'. Available: ${onHand} ${item.unitOfMeasure}, Requested: ${item.quantity} ${item.unitOfMeasure}`;
      }
    }

    setItems(updatedItems);
    setCheckingAvailability(false);

    const docId = isNew ? `del_${Date.now()}` : id!;
    const wh = warehouses.find(w => w.id === sourceWarehouseId);
    const loc = locations.find(l => l.id === sourceLocationId);

    if (allAvailable) {
      setStatus('Ready');
      setAvailabilityMessage({
        type: 'success',
        text: 'All items are reserved and available for packing and dispatch.'
      });

      await setDocumentData('deliveries', docId, {
        id: docId,
        deliveryNumber,
        customer: customer.trim() || 'Valued Customer',
        date: new Date(date).toISOString(),
        sourceWarehouseId,
        sourceWarehouseName: wh?.name || 'Main Warehouse',
        sourceLocationId,
        sourceLocationName: loc?.name || 'Default Location',
        notes: notes.trim(),
        status: 'Ready',
        items: updatedItems,
        createdBy: user?.id || 'admin',
        createdByName: user?.name || 'Administrator',
        createdAt: deliveryRecord?.createdAt || new Date().toISOString()
      });

      showToast('success', 'Stock available. Order is Ready for validation.');
      if (isNew) {
        navigate(`/operations/deliveries/${docId}`, { replace: true });
      }
    } else {
      setStatus('Waiting');
      setAvailabilityMessage({
        type: 'warning',
        text: shortageMessage
      });
      showToast('warning', shortageMessage);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!customer.trim()) {
      showToast('error', 'Customer name is required.');
      return;
    }

    const wh = warehouses.find(w => w.id === sourceWarehouseId);
    const loc = locations.find(l => l.id === sourceLocationId);
    const docId = isNew ? `del_${Date.now()}` : id!;

    const payload: Delivery = {
      id: docId,
      deliveryNumber,
      customer: customer.trim(),
      date: new Date(date).toISOString(),
      sourceWarehouseId,
      sourceWarehouseName: wh?.name || 'Main Warehouse',
      sourceLocationId,
      sourceLocationName: loc?.name || 'Default Location',
      notes: notes.trim(),
      status: status === 'Done' ? 'Done' : 'Draft',
      items,
      createdBy: user?.id || 'admin',
      createdByName: user?.name || 'Administrator',
      createdAt: deliveryRecord?.createdAt || new Date().toISOString()
    };

    await setDocumentData('deliveries', docId, payload);
    showToast('success', `Delivery order ${deliveryNumber} saved.`);
    if (isNew) {
      navigate(`/operations/deliveries/${docId}`, { replace: true });
    }
  };

  // Validate Delivery via Critical Stock Engine
  const handleValidate = async () => {
    if (!user) return;
    setValidating(true);

    try {
      const docId = isNew ? `del_${Date.now()}` : id!;
      const wh = warehouses.find(w => w.id === sourceWarehouseId);
      const loc = locations.find(l => l.id === sourceLocationId);

      // Persist latest state
      const payload: Delivery = {
        id: docId,
        deliveryNumber,
        customer: customer.trim(),
        date: new Date(date).toISOString(),
        sourceWarehouseId,
        sourceWarehouseName: wh?.name || 'Main Warehouse',
        sourceLocationId,
        sourceLocationName: loc?.name || 'Default Location',
        notes: notes.trim(),
        status: 'Ready',
        items,
        createdBy: user?.id || 'admin',
        createdByName: user?.name || 'Administrator',
        createdAt: deliveryRecord?.createdAt || new Date().toISOString()
      };
      await setDocumentData('deliveries', docId, payload);

      // Execute atomic stock delivery deduction
      const result = await deliverStock(docId, user);

      setStatus('Done');
      setConfirmValidateOpen(false);
      showToast('success', result.message);

      if (isNew) {
        navigate(`/operations/deliveries/${docId}`, { replace: true });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  const handleCancel = async () => {
    if (!id || isNew) return;
    try {
      await updateDocumentData('deliveries', id, { status: 'Canceled' });
      setStatus('Canceled');
      setConfirmCancelOpen(false);
      showToast('info', `Delivery order ${deliveryNumber} marked as Canceled.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel delivery');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDone = status === 'Done';
  const isCanceled = status === 'Canceled';
  const isReadOnly = isDone || isCanceled;

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Bar Actions & Odoo Pipeline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/deliveries')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Deliveries
          </Button>

          {!isReadOnly && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCheckAvailability}
                loading={checkingAvailability}
                icon={<Search className="w-3.5 h-3.5" />}
              >
                Check Availability
              </Button>

              <Button
                variant="success"
                size="sm"
                onClick={() => setConfirmValidateOpen(true)}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate Delivery
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
          <StatusBarPipeline currentStatus={status} stages={['Draft', 'Waiting', 'Ready', 'Done']} />
        </div>
      </div>

      {/* Availability Notice Banner */}
      {availabilityMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
          availabilityMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
        }`}>
          {availabilityMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-semibold">{availabilityMessage.text}</span>
        </div>
      )}

      {/* Main Delivery Order Sheet */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-8">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Delivery Order (DO)
            </span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {deliveryNumber}
            </h1>
            {isDone && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Validated and dispatched on {formatDate(deliveryRecord?.validatedAt || new Date().toISOString())}
              </p>
            )}
          </div>

          <div className="text-right text-xs text-slate-500">
            <p>Created by: <span className="font-semibold text-slate-800 dark:text-slate-200">{deliveryRecord?.createdByName || user?.name}</span></p>
            <p className="mt-0.5">Date: {formatDate(date, 'MMM dd, yyyy')}</p>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label="Customer / Client"
            placeholder="e.g. Apex Innovations Corp"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            disabled={isReadOnly}
            leftIcon={<Users className="w-4 h-4" />}
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
            label="Source Warehouse"
            value={sourceWarehouseId}
            onChange={(e) => {
              setSourceWarehouseId(e.target.value);
              const matching = locations.filter(l => l.warehouseId === e.target.value);
              if (matching[0]) setSourceLocationId(matching[0].id);
            }}
            disabled={isReadOnly}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            required
          />

          <Select
            label="Source Location / Bay"
            value={sourceLocationId}
            onChange={(e) => setSourceLocationId(e.target.value)}
            disabled={isReadOnly}
            options={availableLocations.map(l => ({ value: l.id, label: l.name }))}
            required
          />
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Ordered Product Items
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
                  <th className="py-3 px-4 text-right">Available in Bay</th>
                  <th className="py-3 px-4 text-right">Requested Qty</th>
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
                    <td className="py-3 px-4 text-right font-medium text-slate-500">
                      {item.availableQuantity !== undefined ? item.availableQuantity : '-'}
                    </td>
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
            Shipping & Dispatch Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            placeholder="Special delivery instructions, packaging notes, or gate pass requirements..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-xs focus:ring-2 focus:ring-[#714B67]/30"
          />
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Validate Delivery Order"
        message="Validating will verify sufficient physical stock, immediately deduct inventory from the source location, and write an immutable delivery entry to the Stock Ledger. Continue?"
        variant="primary"
        confirmText="Confirm & Deduct Stock"
        loading={validating}
      />

      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Delivery Order"
        message="Are you sure you want to mark this delivery order as Canceled?"
        variant="danger"
        confirmText="Yes, Cancel"
      />
    </div>
  );
};
