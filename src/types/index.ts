export type UserRole = 'Admin' | 'Inventory Manager' | 'Warehouse Staff';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Location {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  name: string;
  code: string;
  active: boolean;
  createdAt?: string;
}

export interface StockBalance {
  id: string; // composite: `${productId}_${locationId}`
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  unitOfMeasure: string;
  description: string;
  reorderLevel: number;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  price?: number;
  cost?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OperationStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';

export interface ReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
  receivedQuantity?: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  supplier: string;
  date: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  notes: string;
  status: OperationStatus;
  items: ReceiptItem[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  validatedAt?: string;
}

export interface DeliveryItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
  availableQuantity?: number;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  customer: string;
  date: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  sourceLocationId: string;
  sourceLocationName: string;
  notes: string;
  status: OperationStatus;
  items: DeliveryItem[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  validatedAt?: string;
}

export interface TransferItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface Transfer {
  id: string;
  transferNumber: string;
  date: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  sourceLocationId: string;
  sourceLocationName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  notes: string;
  status: 'Draft' | 'Ready' | 'Done' | 'Canceled';
  items: TransferItem[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  validatedAt?: string;
}

export interface Adjustment {
  id: string;
  adjustmentNumber: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reason: string;
  notes: string;
  status: 'Draft' | 'Done' | 'Canceled';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  validatedAt?: string;
}

export type StockOperationType = 
  | 'RECEIPT'
  | 'DELIVERY'
  | 'TRANSFER'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  operationType: StockOperationType;
  referenceId: string;
  referenceNumber: string;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  fromLocationId?: string;
  fromLocationName?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  toLocationId?: string;
  toLocationName?: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  userId: string;
  userName: string;
  notes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  companyAddress: string;
  defaultWarehouseId: string;
  defaultCurrency: string;
  timezone: string;
  lowStockAlertThreshold: number;
  emailAlertsEnabled: boolean;
  enableSoundEffects?: boolean;
}

export interface DashboardKPIs {
  totalProducts: number;
  totalStockUnits: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  transfersToday: number;
  adjustmentsToday: number;
}

export interface StockOperationResult {
  success: boolean;
  message: string;
  documentId?: string;
  documentNumber?: string;
  ledgerEntries?: StockLedgerEntry[];
}

export interface StockCheckItem {
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  locationName: string;
  requiredQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface CategoryValuation {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  totalUnits: number;
  totalValue: number;
}

export interface WarehouseOccupancy {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  locationsCount: number;
  totalUnits: number;
  totalSKUs: number;
}

export interface ReorderingRule {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  minQuantity: number;
  preferredQuantity: number;
  unitOfMeasure: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}


