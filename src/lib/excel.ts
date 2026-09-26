import * as XLSX from 'xlsx';
import { Product, StockLedgerEntry } from '../types';

export interface ParsedProductRow {
  rowIndex: number;
  name: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  reorderLevel: number;
  warehouse: string;
  location: string;
  initialStock: number;
  isValid: boolean;
  errors: string[];
}

export function exportProductsToExcel(products: Product[], filename = 'StockSense_Products.xlsx') {
  const data = products.map(p => ({
    'Product Name': p.name,
    'SKU': p.sku,
    'Category': p.categoryName || '-',
    'Unit': p.unitOfMeasure,
    'Total Stock': p.totalStock,
    'Reserved Stock': p.reservedStock,
    'Available Stock': p.availableStock,
    'Reorder Level': p.reorderLevel,
    'Unit Cost ($)': p.cost || 0,
    'Unit Price ($)': p.price || 0,
    'Stock Status': p.totalStock <= 0 ? 'Out of Stock' : (p.availableStock <= p.reorderLevel ? 'Low Stock' : 'In Stock'),
    'Active': p.active ? 'Yes' : 'No',
    'Created At': p.createdAt
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  // Auto-column widths
  const maxProps = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 14)
  }));
  worksheet['!cols'] = maxProps;

  XLSX.writeFile(workbook, filename);
}

export function exportMoveHistoryToExcel(entries: StockLedgerEntry[], filename = 'StockSense_Move_History.xlsx') {
  const data = entries.map(e => ({
    'Date & Time': e.createdAt,
    'Reference': e.referenceNumber,
    'Product Name': e.productName,
    'SKU': e.sku,
    'Operation': e.operationType,
    'Quantity': e.quantity,
    'Before Qty': e.beforeQuantity,
    'After Qty': e.afterQuantity,
    'From Warehouse': e.fromWarehouseName || '-',
    'From Location': e.fromLocationName || '-',
    'To Warehouse': e.toWarehouseName || '-',
    'To Location': e.toLocationName || '-',
    'Logged By': e.userName,
    'Notes / Reason': e.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Movements');
  XLSX.writeFile(workbook, filename);
}

export function exportReportToExcel(data: any[], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function generateProductsSampleExcel() {
  const sampleData = [
    {
      name: 'Hydraulic Cylinder 50mm',
      sku: 'HYD-CYL-500',
      category: 'Raw Materials',
      unitOfMeasure: 'Units',
      reorderLevel: 10,
      warehouse: 'Main Warehouse',
      location: 'Rack A - Heavy Stock',
      initialStock: 40
    },
    {
      name: 'Safety Glasses Anti-Fog',
      sku: 'SAF-GLS-101',
      category: 'Safety & PPE',
      unitOfMeasure: 'Units',
      reorderLevel: 25,
      warehouse: 'Production Warehouse',
      location: 'Production Floor',
      initialStock: 120
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Template');
  XLSX.writeFile(workbook, 'StockSense_Product_Import_Template.xlsx');
}

export async function parseProductsExcel(file: File, existingSkus: Set<string>): Promise<{
  rows: ParsedProductRow[];
  totalValid: number;
  totalInvalid: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawJson.length < 2) {
          throw new Error('Excel sheet appears to be empty or missing header row.');
        }

        // Header mapping
        const headers = (rawJson[0] as string[]).map(h => String(h || '').trim().toLowerCase());
        const expectedCols = {
          name: ['name', 'product name', 'product'],
          sku: ['sku', 'code', 'sku / code'],
          category: ['category', 'category name'],
          unitOfMeasure: ['unitofmeasure', 'unit', 'uom', 'unit of measure'],
          reorderLevel: ['reorderlevel', 'reorder level', 'min stock'],
          warehouse: ['warehouse', 'warehouse name'],
          location: ['location', 'location name'],
          initialStock: ['initialstock', 'initial stock', 'quantity', 'qty']
        };

        const getIndex = (aliases: string[]) => headers.findIndex(h => aliases.includes(h));

        const nameIdx = getIndex(expectedCols.name);
        const skuIdx = getIndex(expectedCols.sku);
        const catIdx = getIndex(expectedCols.category);
        const uomIdx = getIndex(expectedCols.unitOfMeasure);
        const reorderIdx = getIndex(expectedCols.reorderLevel);
        const whIdx = getIndex(expectedCols.warehouse);
        const locIdx = getIndex(expectedCols.location);
        const stockIdx = getIndex(expectedCols.initialStock);

        if (nameIdx === -1 || skuIdx === -1) {
          throw new Error('Required columns "name" and "sku" were not found in the uploaded file header.');
        }

        const parsedRows: ParsedProductRow[] = [];
        const seenSkusInFile = new Set<string>();

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === '')) {
            continue; // Skip blank rows
          }

          const name = String(row[nameIdx] || '').trim();
          const sku = String(row[skuIdx] || '').trim().toUpperCase();
          const category = catIdx >= 0 ? String(row[catIdx] || '').trim() : 'General';
          const unitOfMeasure = uomIdx >= 0 ? String(row[uomIdx] || '').trim() : 'Units';
          const rawReorder = reorderIdx >= 0 ? Number(row[reorderIdx]) : 10;
          const warehouse = whIdx >= 0 ? String(row[whIdx] || '').trim() : 'Main Warehouse';
          const location = locIdx >= 0 ? String(row[locIdx] || '').trim() : 'Rack A - Heavy Stock';
          const rawStock = stockIdx >= 0 ? Number(row[stockIdx]) : 0;

          const errors: string[] = [];

          if (!name) errors.push('Product name is required.');
          if (!sku) errors.push('SKU is required.');
          if (existingSkus.has(sku)) errors.push(`SKU '${sku}' already exists in the system.`);
          if (seenSkusInFile.has(sku)) errors.push(`Duplicate SKU '${sku}' found inside this Excel file.`);
          if (isNaN(rawReorder) || rawReorder < 0) errors.push('Reorder level must be a non-negative number.');
          if (isNaN(rawStock) || rawStock < 0) errors.push('Initial stock cannot be negative.');

          seenSkusInFile.add(sku);

          parsedRows.push({
            rowIndex: i + 1,
            name,
            sku,
            category: category || 'General',
            unitOfMeasure: unitOfMeasure || 'Units',
            reorderLevel: isNaN(rawReorder) ? 10 : Math.max(0, rawReorder),
            warehouse: warehouse || 'Main Warehouse',
            location: location || 'Rack A - Heavy Stock',
            initialStock: isNaN(rawStock) ? 0 : Math.max(0, rawStock),
            isValid: errors.length === 0,
            errors
          });
        }

        const totalValid = parsedRows.filter(r => r.isValid).length;
        const totalInvalid = parsedRows.filter(r => !r.isValid).length;

        resolve({ rows: parsedRows, totalValid, totalInvalid });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.readAsBinaryString(file);
  });
}
