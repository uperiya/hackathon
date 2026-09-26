import {
  DashboardKPIs,
  Product,
  Category,
  Warehouse,
  Location,
  StockBalance,
  Receipt,
  Delivery,
  Transfer,
  Adjustment,
  StockLedgerEntry,
  CategoryValuation,
  WarehouseOccupancy
} from '../types';
import { getCollectionData } from '../lib/storage';

export const dashboardService = {
  async getKPIs(): Promise<DashboardKPIs> {
    const [products, receipts, deliveries, transfers, adjustments] = await Promise.all([
      getCollectionData<Product>('products'),
      getCollectionData<Receipt>('receipts'),
      getCollectionData<Delivery>('deliveries'),
      getCollectionData<Transfer>('transfers'),
      getCollectionData<Adjustment>('adjustments')
    ]);

    const activeProducts = products.filter(p => p.active);
    const totalProducts = activeProducts.length;
    const totalStockUnits = activeProducts.reduce((sum, p) => sum + (p.totalStock || 0), 0);
    const lowStockItems = activeProducts.filter(p => (p.totalStock || 0) <= (p.reorderLevel || 0) && (p.totalStock || 0) > 0).length;
    const outOfStockItems = activeProducts.filter(p => (p.totalStock || 0) <= 0).length;

    const pendingReceipts = receipts.filter(r => r.status !== 'Done' && r.status !== 'Canceled').length;
    const pendingDeliveries = deliveries.filter(d => d.status !== 'Done' && d.status !== 'Canceled').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const transfersToday = transfers.filter(t => (t.validatedAt || t.createdAt || '').startsWith(todayStr)).length;
    const adjustmentsToday = adjustments.filter(a => (a.validatedAt || a.createdAt || '').startsWith(todayStr)).length;

    return {
      totalProducts,
      totalStockUnits,
      lowStockItems,
      outOfStockItems,
      pendingReceipts,
      pendingDeliveries,
      transfersToday,
      adjustmentsToday
    };
  },

  async getValuationByCategory(): Promise<CategoryValuation[]> {
    const [products, categories] = await Promise.all([
      getCollectionData<Product>('products'),
      getCollectionData<Category>('categories')
    ]);

    return categories.map(cat => {
      const catProducts = products.filter(p => p.categoryId === cat.id && p.active);
      const itemCount = catProducts.length;
      const totalUnits = catProducts.reduce((sum, p) => sum + (p.totalStock || 0), 0);
      const totalValue = catProducts.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.cost || p.price || 0)), 0);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        itemCount,
        totalUnits,
        totalValue: Math.round(totalValue * 100) / 100
      };
    });
  },

  async getWarehouseOccupancies(): Promise<WarehouseOccupancy[]> {
    const [warehouses, locations, balances] = await Promise.all([
      getCollectionData<Warehouse>('warehouses'),
      getCollectionData<Location>('locations'),
      getCollectionData<StockBalance>('stockBalances')
    ]);

    return warehouses.map(wh => {
      const whLocations = locations.filter(l => l.warehouseId === wh.id);
      const locIds = new Set(whLocations.map(l => l.id));
      const whBalances = balances.filter(b => locIds.has(b.locationId) && b.quantity > 0);

      const totalUnits = whBalances.reduce((sum, b) => sum + b.quantity, 0);
      const uniqueProductIds = new Set(whBalances.map(b => b.productId));

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        locationsCount: whLocations.length,
        totalUnits,
        totalSKUs: uniqueProductIds.size
      };
    });
  },

  async getRecentActivities(limitCount = 10): Promise<StockLedgerEntry[]> {
    const entries = await getCollectionData<StockLedgerEntry>('stockLedger');
    return entries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitCount);
  }
};
