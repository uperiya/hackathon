import { deliverStock, getStockBalance } from './stockEngine';
import { productsService } from './productsService';
import { deliveriesService } from './deliveriesService';
import { stockLedgerService } from './stockLedgerService';
import { setDocumentData } from '../lib/storage';
import { UserProfile, StockBalance } from '../types';

/**
 * Concurrency & Race Condition Verification Suite
 * 
 * Demonstrates and verifies that when two concurrent operations attempt to deliver
 * 80 units from a location having only 100 units, both operations CANNOT succeed.
 * One transaction succeeds, and the conflicting transaction is rejected with an
 * insufficient stock error, guaranteeing that negative stock is mathematically impossible.
 */
export async function runRaceConditionTest(): Promise<{
  passed: boolean;
  message: string;
  details: {
    initialStock: number;
    order1Result: string;
    order2Result: string;
    finalLocationStock: number;
    finalCatalogStock: number;
  };
}> {
  const testStaffUser: UserProfile = {
    id: 'user_test_runner',
    name: 'Concurrency Test Runner',
    email: 'test@stocksense.com',
    role: 'Warehouse Staff',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const testLocationId = 'loc_test_bay_concurrency';
  const testWarehouseId = 'wh_test_facility';

  // 1. Create a dedicated test product with totalStock = 100
  const testProduct = await productsService.create({
    name: 'Concurrency Test Item (High-Grade Steel Plate)',
    sku: `TEST-RACE-${Date.now()}`,
    categoryId: 'cat_raw_materials',
    unitOfMeasure: 'Units',
    description: 'Item dedicated for atomic concurrency testing',
    reorderLevel: 20,
    totalStock: 100,
    availableStock: 100,
    reservedStock: 0,
    active: true
  });

  // 2. Set location balance to 100
  const initialBalance: StockBalance = {
    id: `${testProduct.id}_${testLocationId}`,
    productId: testProduct.id,
    warehouseId: testWarehouseId,
    locationId: testLocationId,
    quantity: 100,
    updatedAt: new Date().toISOString()
  };
  await setDocumentData('stockBalances', initialBalance.id, initialBalance);

  // 3. Create two concurrent delivery orders for 80 units each
  const orderA = await deliveriesService.create({
    customer: 'Alpha Client Logistics',
    date: new Date().toISOString(),
    sourceWarehouseId: testWarehouseId,
    sourceWarehouseName: 'Test Facility',
    sourceLocationId: testLocationId,
    sourceLocationName: 'Bay Concurrency',
    items: [
      {
        productId: testProduct.id,
        productName: testProduct.name,
        sku: testProduct.sku,
        quantity: 80,
        unitOfMeasure: 'Units'
      }
    ],
    createdBy: testStaffUser.id,
    createdByName: testStaffUser.name
  });

  const orderB = await deliveriesService.create({
    customer: 'Beta Client Logistics',
    date: new Date().toISOString(),
    sourceWarehouseId: testWarehouseId,
    sourceWarehouseName: 'Test Facility',
    sourceLocationId: testLocationId,
    sourceLocationName: 'Bay Concurrency',
    items: [
      {
        productId: testProduct.id,
        productName: testProduct.name,
        sku: testProduct.sku,
        quantity: 80,
        unitOfMeasure: 'Units'
      }
    ],
    createdBy: testStaffUser.id,
    createdByName: testStaffUser.name
  });

  // 4. Execute BOTH deliveries concurrently (simultaneous async calls)
  const [resA, resB] = await Promise.allSettled([
    deliverStock(orderA.id, testStaffUser),
    deliverStock(orderB.id, testStaffUser)
  ]);

  // 5. Inspect outcomes
  const order1Status = resA.status === 'fulfilled' ? 'SUCCESS' : `FAILED: ${(resA as PromiseRejectedResult).reason?.message}`;
  const order2Status = resB.status === 'fulfilled' ? 'SUCCESS' : `FAILED: ${(resB as PromiseRejectedResult).reason?.message}`;

  const finalBalRecord = await getStockBalance(testProduct.id, testLocationId);
  const finalLocationStock = finalBalRecord ? finalBalRecord.quantity : 0;

  const finalProd = await productsService.getById(testProduct.id);
  const finalCatalogStock = finalProd ? finalProd.totalStock : 0;

  const successCount = (resA.status === 'fulfilled' ? 1 : 0) + (resB.status === 'fulfilled' ? 1 : 0);
  const failureCount = (resA.status === 'rejected' ? 1 : 0) + (resB.status === 'rejected' ? 1 : 0);

  const passed = successCount === 1 && failureCount === 1 && finalLocationStock === 20 && finalCatalogStock === 20;

  return {
    passed,
    message: passed
      ? 'Concurrency race condition successfully guarded! Exactly 1 delivery succeeded, 1 was rejected with Insufficient Stock, and final stock remained at 20 (no negative stock).'
      : `Test failed: Successes=${successCount}, Failures=${failureCount}, Final Stock=${finalLocationStock}`,
    details: {
      initialStock: 100,
      order1Result: order1Status,
      order2Result: order2Status,
      finalLocationStock,
      finalCatalogStock
    }
  };
}
