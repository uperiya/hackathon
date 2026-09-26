import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { parseProductsExcel, generateProductsSampleExcel, ParsedProductRow } from '../../lib/excel';
import { setDocumentData, addDocumentData } from '../../lib/storage';
import { useNotification } from '../../context/NotificationContext';
import { Product, Warehouse, Location, Category } from '../../types';
import { generateId } from '../../lib/utils';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingSkus: Set<string>;
  categories: Category[];
  warehouses: Warehouse[];
  locations: Location[];
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingSkus,
  categories,
  warehouses,
  locations,
}) => {
  const { showToast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg('');
    setParsing(true);

    try {
      const result = await parseProductsExcel(selectedFile, existingSkus);
      setParsedRows(result.rows);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse Excel file. Please ensure it follows the template format.');
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleCommitImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('error', 'There are no valid rows to import.');
      return;
    }

    setImporting(true);
    try {
      let importedCount = 0;

      for (const row of validRows) {
        // Resolve or create category
        let cat = categories.find(c => c.name.toLowerCase() === row.category.toLowerCase());
        const catId = cat ? cat.id : 'cat_general';
        const catName = cat ? cat.name : row.category;

        // Resolve warehouse and location
        const wh = warehouses.find(w => w.name.toLowerCase() === row.warehouse.toLowerCase()) || warehouses[0];
        const loc = locations.find(l => l.name.toLowerCase() === row.location.toLowerCase()) || locations[0];

        const newProdId = generateId('prod');

        const newProd: Product = {
          id: newProdId,
          name: row.name,
          sku: row.sku,
          categoryId: catId,
          categoryName: catName,
          unitOfMeasure: row.unitOfMeasure,
          description: `Imported via Excel Batch (${file?.name || 'XLSX'})`,
          reorderLevel: row.reorderLevel,
          totalStock: row.initialStock,
          reservedStock: 0,
          availableStock: row.initialStock,
          price: 0,
          cost: 0,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDocumentData('products', newProdId, newProd);

        if (row.initialStock > 0 && wh && loc) {
          await setDocumentData('stockBalances', `${newProdId}_${loc.id}`, {
            id: `${newProdId}_${loc.id}`,
            productId: newProdId,
            warehouseId: wh.id,
            locationId: loc.id,
            quantity: row.initialStock,
            updatedAt: new Date().toISOString()
          });

          await addDocumentData('stockLedger', {
            id: generateId('LEDG'),
            productId: newProdId,
            productName: row.name,
            sku: row.sku,
            operationType: 'RECEIPT',
            referenceId: 'EXCEL_IMPORT',
            referenceNumber: `EXCEL-IMPORT-${row.sku}`,
            toWarehouseId: wh.id,
            toWarehouseName: wh.name,
            toLocationId: loc.id,
            toLocationName: loc.name,
            quantity: row.initialStock,
            beforeQuantity: 0,
            afterQuantity: row.initialStock,
            userId: 'excel_importer',
            userName: 'Excel Import Wizard',
            notes: `Batch imported from ${file?.name}`,
            createdAt: new Date().toISOString()
          });
        }

        importedCount++;
      }

      showToast('success', `Successfully imported ${importedCount} product(s) into inventory!`);
      onImportComplete();
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Products from Excel (.xlsx)"
      subtitle="Upload a spreadsheet with product definitions and initial quantities."
      maxWidth="4xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCommitImport}
            disabled={validCount === 0 || importing}
            loading={importing}
          >
            Import {validCount} Valid Product{validCount === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Step 1: Template and Dropzone */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Need the standard spreadsheet format?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download the official template with pre-configured columns and examples.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateProductsSampleExcel}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Download Sample Excel
          </Button>
        </div>

        {/* Upload File Input */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#714B67] dark:hover:border-purple-400 p-8 rounded-2xl text-center bg-white dark:bg-slate-900 transition flex flex-col items-center justify-center"
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {file ? file.name : 'Click to browse or drop Excel spreadsheet here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .xlsx and .xls files
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-200">
                Import Preview ({parsedRows.length} Rows Detected)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {validCount} Ready
                </span>
                {invalidCount > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {invalidCount} Errors
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Initial Stock</th>
                    <th className="py-2 px-3">Warehouse / Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.map((r) => (
                    <tr
                      key={r.rowIndex}
                      className={r.isValid ? 'bg-white dark:bg-slate-900' : 'bg-rose-50/50 dark:bg-rose-950/20'}
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <div className="text-rose-600 font-medium flex items-center gap-1" title={r.errors.join(', ')}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{r.errors[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-100">{r.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{r.sku}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.category}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">{r.initialStock} {r.unitOfMeasure}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{r.warehouse} / {r.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
