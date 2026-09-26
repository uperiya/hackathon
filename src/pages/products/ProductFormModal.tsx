import React, { useState, useEffect } from 'react';
import { Product, Category, Warehouse, Location } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { setDocumentData, addDocumentData, getCollectionData } from '../../lib/storage';
import { useNotification } from '../../context/NotificationContext';
import { generateId } from '../../lib/utils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSaved: () => void;
  existingSkus: Set<string>;
  categories: Category[];
  warehouses: Warehouse[];
  locations: Location[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaved,
  existingSkus,
  categories,
  warehouses,
  locations,
}) => {
  const { showToast } = useNotification();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('Units');
  const [description, setDescription] = useState('');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setCategoryId(productToEdit.categoryId);
      setUnitOfMeasure(productToEdit.unitOfMeasure);
      setDescription(productToEdit.description || '');
      setReorderLevel(productToEdit.reorderLevel);
      setPrice(productToEdit.price || 0);
      setCost(productToEdit.cost || 0);
      setInitialStock(0); // Not editable directly once product exists
    } else {
      setName('');
      setSku('');
      setCategoryId(categories[0]?.id || '');
      setUnitOfMeasure('Units');
      setDescription('');
      setReorderLevel(10);
      setPrice(0);
      setCost(0);
      setInitialStock(0);
      if (warehouses[0]) {
        setSelectedWarehouseId(warehouses[0].id);
      }
    }
    setErrors({});
  }, [productToEdit, isOpen, categories, warehouses]);

  // Update available locations when warehouse changes
  const availableLocations = locations.filter(l => l.warehouseId === selectedWarehouseId);

  useEffect(() => {
    if (availableLocations.length > 0 && !productToEdit) {
      setSelectedLocationId(availableLocations[0].id);
    }
  }, [selectedWarehouseId, availableLocations.length, productToEdit]);

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Product name is required.';
    if (!sku.trim()) errs.sku = 'SKU is required.';
    else {
      const cleanSku = sku.trim().toUpperCase();
      // Check SKU uniqueness if new or changed
      if ((!productToEdit || productToEdit.sku !== cleanSku) && existingSkus.has(cleanSku)) {
        errs.sku = `SKU '${cleanSku}' already exists in inventory. SKUs must be unique.`;
      }
    }

    if (!categoryId) errs.categoryId = 'Please select a category.';
    if (!unitOfMeasure.trim()) errs.unitOfMeasure = 'Unit of measure is required.';
    if (reorderLevel < 0) errs.reorderLevel = 'Reorder level cannot be negative.';
    if (initialStock < 0) errs.initialStock = 'Initial stock cannot be negative.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const matchedCategory = categories.find(c => c.id === categoryId);
      const cleanSku = sku.trim().toUpperCase();

      if (productToEdit) {
        // Edit existing product
        const updated: Partial<Product> = {
          name: name.trim(),
          sku: cleanSku,
          categoryId,
          categoryName: matchedCategory?.name || 'General',
          unitOfMeasure: unitOfMeasure.trim(),
          description: description.trim(),
          reorderLevel: Number(reorderLevel),
          price: Number(price),
          cost: Number(cost),
          updatedAt: new Date().toISOString()
        };

        await setDocumentData('products', productToEdit.id, { ...productToEdit, ...updated });
        showToast('success', `Product '${name}' updated successfully.`);
      } else {
        // Create new product
        const newProdId = generateId('prod');
        const total = Number(initialStock);

        const newProd: Product = {
          id: newProdId,
          name: name.trim(),
          sku: cleanSku,
          categoryId,
          categoryName: matchedCategory?.name || 'General',
          unitOfMeasure: unitOfMeasure.trim(),
          description: description.trim(),
          reorderLevel: Number(reorderLevel),
          totalStock: total,
          reservedStock: 0,
          availableStock: total,
          price: Number(price),
          cost: Number(cost),
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDocumentData('products', newProdId, newProd);

        // If initial stock was provided, record location balance and initial ledger
        if (total > 0 && selectedWarehouseId && selectedLocationId) {
          const matchedWh = warehouses.find(w => w.id === selectedWarehouseId);
          const matchedLoc = locations.find(l => l.id === selectedLocationId);

          await setDocumentData('stockBalances', `${newProdId}_${selectedLocationId}`, {
            id: `${newProdId}_${selectedLocationId}`,
            productId: newProdId,
            warehouseId: selectedWarehouseId,
            locationId: selectedLocationId,
            quantity: total,
            updatedAt: new Date().toISOString()
          });

          await addDocumentData('stockLedger', {
            id: generateId('LEDG'),
            productId: newProdId,
            productName: newProd.name,
            sku: cleanSku,
            operationType: 'RECEIPT',
            referenceId: 'INITIAL_STOCK',
            referenceNumber: 'INITIAL-STOCK-SETUP',
            toWarehouseId: selectedWarehouseId,
            toWarehouseName: matchedWh?.name || 'Main Warehouse',
            toLocationId: selectedLocationId,
            toLocationName: matchedLoc?.name || 'Default Location',
            quantity: total,
            beforeQuantity: 0,
            afterQuantity: total,
            userId: 'system',
            userName: 'System Setup',
            notes: 'Initial inventory quantity assignment upon product creation',
            createdAt: new Date().toISOString()
          });
        }

        showToast('success', `Product '${name}' created successfully with SKU ${cleanSku}.`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product' : 'Create New Product'}
      subtitle="Configure product catalog attributes, stock parameters, and reorder levels."
      maxWidth="2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={submitting}>
            {productToEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            placeholder="e.g. Ergonomic Office Chair"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="SKU / Barcode"
            placeholder="e.g. FURN-CHR-002"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            error={errors.sku}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Product Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            error={errors.categoryId}
            required
          />

          <Select
            label="Unit of Measure"
            value={unitOfMeasure}
            onChange={(e) => setUnitOfMeasure(e.target.value)}
            options={[
              { value: 'Units', label: 'Units (pcs)' },
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'Meters', label: 'Meters (m)' },
              { value: 'Liters', label: 'Liters (L)' },
              { value: 'Boxes', label: 'Boxes (bx)' },
              { value: 'Pallets', label: 'Pallets (plt)' },
            ]}
            error={errors.unitOfMeasure}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Reorder Threshold"
            type="number"
            min="0"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(Number(e.target.value))}
            error={errors.reorderLevel}
            helperText="Alerts when available stock falls to or below this"
            required
          />

          <Input
            label="Unit Cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            helperText="Purchase / manufacturing cost"
          />

          <Input
            label="Sales Price ($)"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            helperText="Standard customer price"
          />
        </div>

        {!productToEdit && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Initial Stock Allocation (Optional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Initial Quantity"
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(Number(e.target.value))}
                error={errors.initialStock}
              />

              <Select
                label="Warehouse"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                disabled={initialStock <= 0}
              />

              <Select
                label="Location"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                options={availableLocations.map(l => ({ value: l.id, label: l.name }))}
                disabled={initialStock <= 0}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Description / Specifications
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical details, dimensions, grade, and storage notes..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-[#714B67]/30 focus:border-[#714B67]"
          />
        </div>
      </form>
    </Modal>
  );
};
