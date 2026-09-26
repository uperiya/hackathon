// Polyfill localStorage and window for headless node testing if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0
  };
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

import { initLocalData, resetDatabaseToSeed } from '../src/lib/storage';
initLocalData();
resetDatabaseToSeed();

import {
  usersService,
  productsService,
  categoriesService,
  warehousesService,
  locationsService,
  receiptsService,
  deliveriesService,
  transfersService,
  adjustmentsService,
  stockLedgerService,
  dashboardService,
  notificationsService,
  reorderingRulesService,
  receiveStock,
  deliverStock,
  transferStock,
  adjustStock,
  getStockBalance
} from '../src/services';
import { runRaceConditionTest } from '../src/services/verifyStockEngine';
import { UserProfile } from '../src/types';

async function runTestSuite() {
  console.log('================================================================');
  console.log('StockSense Comprehensive Services & Operations Test Suite');
  console.log('================================================================\n');

  const adminUser: UserProfile = {
    id: 'user_admin_01',
    name: 'Alexandra Vance',
    email: 'admin@stocksense.com',
    role: 'Admin',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Users Service Test
  console.log('Testing 1. Users Service...');
  const users = await usersService.getAll();
  console.log(`  ✓ Retrieved ${users.length} initial users.`);
  const newUser = await usersService.create({
    name: 'Test Logistics Worker',
    email: `worker_${Date.now()}@stocksense.com`,
    role: 'Warehouse Staff',
    phone: '+1 555-0199'
  });
  console.log(`  ✓ Created user: ${newUser.name} (${newUser.role})`);
  const updatedUser = await usersService.update(newUser.id, { phone: '+1 555-9999' });
  if (updatedUser.phone !== '+1 555-9999') throw new Error('User update failed');
  console.log('  ✓ Users Service PASSED.\n');

  // 2. Categories Service Test
  console.log('Testing 2. Categories Service...');
  const categories = await categoriesService.getAll();
  console.log(`  ✓ Retrieved ${categories.length} categories with live product counts.`);
  const newCat = await categoriesService.create({
    name: `Packaging-${Date.now()}`,
    description: 'Automated test packaging material'
  });
  console.log(`  ✓ Created category: ${newCat.name}`);
  const catById = await categoriesService.getById(newCat.id);
  if (!catById) throw new Error('Category getById failed');
  console.log('  ✓ Categories Service PASSED.\n');

  // 3. Warehouses & Locations Service Test
  console.log('Testing 3. Warehouses & Locations Services...');
  const warehouses = await warehousesService.getAll();
  console.log(`  ✓ Retrieved ${warehouses.length} warehouses.`);
  const newWh = await warehousesService.create({
    name: `Central Hub-${Date.now()}`,
    code: `WH-C${Date.now().toString().slice(-3)}`,
    address: '99 Automation Way, Reno, NV'
  });
  console.log(`  ✓ Created warehouse: ${newWh.name} (${newWh.code})`);

  const newLoc = await locationsService.create({
    warehouseId: newWh.id,
    warehouseName: newWh.name,
    name: 'Inspection Bay 1',
    code: `${newWh.code}/BAY-1`
  });
  console.log(`  ✓ Created location: ${newLoc.name} (${newLoc.code})`);
  const whLocs = await locationsService.getByWarehouse(newWh.id);
  if (whLocs.length !== 1) throw new Error('Location by warehouse failed');
  console.log('  ✓ Warehouses & Locations Services PASSED.\n');

  // 4. Products Service Test
  console.log('Testing 4. Products Service...');
  const products = await productsService.getAll();
  console.log(`  ✓ Retrieved ${products.length} products.`);
  const newProd = await productsService.create({
    name: `Industrial Fastener Lot ${Date.now()}`,
    sku: `FST-${Date.now()}`,
    categoryId: newCat.id,
    categoryName: newCat.name,
    unitOfMeasure: 'Boxes',
    description: 'High tensile metric fasteners',
    reorderLevel: 25,
    totalStock: 50,
    availableStock: 50,
    reservedStock: 0,
    cost: 15.50,
    price: 28.00,
    active: true
  });
  console.log(`  ✓ Created product: ${newProd.name} (SKU: ${newProd.sku})`);
  const lowStockProds = await productsService.getLowStock();
  console.log(`  ✓ Checked low stock items: ${lowStockProds.length} found.`);
  console.log('  ✓ Products Service PASSED.\n');

  // 5. Reordering Rules Service Test
  console.log('Testing 5. Reordering Rules Service...');
  const rules = await reorderingRulesService.getAll();
  console.log(`  ✓ Retrieved ${rules.length} reordering rules.`);
  const newRule = await reorderingRulesService.create({
    productId: newProd.id,
    warehouseId: newWh.id,
    minQuantity: 20,
    preferredQuantity: 80
  });
  console.log(`  ✓ Configured reordering rule: ${newRule.productName} in ${newRule.warehouseName} (Min: ${newRule.minQuantity}, Target: ${newRule.preferredQuantity})`);
  console.log('  ✓ Reordering Rules Service PASSED.\n');

  // 6. Receipts Service & Stock Inflow Test
  console.log('Testing 6. Receipts Service & Stock Engine (RECEIPT: stock + qty)...');
  const receipt = await receiptsService.create({
    supplier: 'Fastener Direct Corp',
    date: new Date().toISOString(),
    destinationWarehouseId: newWh.id,
    destinationWarehouseName: newWh.name,
    destinationLocationId: newLoc.id,
    destinationLocationName: newLoc.name,
    notes: 'Inbound shipment receipt test',
    items: [
      {
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        quantity: 40,
        unitOfMeasure: 'Boxes'
      }
    ],
    createdBy: adminUser.id,
    createdByName: adminUser.name
  });
  console.log(`  ✓ Created draft receipt: ${receipt.receiptNumber}`);
  const receiptValidation = await receiptsService.validate(receipt.id, adminUser);
  console.log(`  ✓ Validated receipt: ${receiptValidation.message}`);

  const postReceiptBalance = await getStockBalance(newProd.id, newLoc.id);
  const postReceiptProd = await productsService.getById(newProd.id);
  console.log(`  ✓ Location stock after receipt: ${postReceiptBalance?.quantity} (Expected: 40)`);
  console.log(`  ✓ Product total catalog stock: ${postReceiptProd?.totalStock} (Expected: 90)`);
  if (postReceiptBalance?.quantity !== 40 || postReceiptProd?.totalStock !== 90) {
    throw new Error('Receipt stock addition formula failed');
  }
  console.log('  ✓ Receipts Service & Stock Inflow PASSED.\n');

  // 7. Deliveries Service & Stock Outflow Test
  console.log('Testing 7. Deliveries Service & Stock Engine (DELIVERY: stock - qty)...');
  const delivery = await deliveriesService.create({
    customer: 'Apex Aerospace Builders',
    date: new Date().toISOString(),
    sourceWarehouseId: newWh.id,
    sourceWarehouseName: newWh.name,
    sourceLocationId: newLoc.id,
    sourceLocationName: newLoc.name,
    notes: 'Outbound delivery test',
    items: [
      {
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        quantity: 15,
        unitOfMeasure: 'Boxes'
      }
    ],
    createdBy: adminUser.id,
    createdByName: adminUser.name
  });
  console.log(`  ✓ Created delivery order: ${delivery.deliveryNumber}`);
  const availability = await deliveriesService.checkAvailability(delivery.id);
  console.log(`  ✓ Availability check: All Available = ${availability.allAvailable}`);
  if (!availability.allAvailable) throw new Error('Delivery availability check failed');

  const deliveryValidation = await deliveriesService.validate(delivery.id, adminUser);
  console.log(`  ✓ Validated delivery: ${deliveryValidation.message}`);

  const postDeliveryBalance = await getStockBalance(newProd.id, newLoc.id);
  const postDeliveryProd = await productsService.getById(newProd.id);
  console.log(`  ✓ Location stock after delivery: ${postDeliveryBalance?.quantity} (Expected: 25)`);
  console.log(`  ✓ Product total catalog stock: ${postDeliveryProd?.totalStock} (Expected: 75)`);
  if (postDeliveryBalance?.quantity !== 25 || postDeliveryProd?.totalStock !== 75) {
    throw new Error('Delivery stock deduction formula failed');
  }
  console.log('  ✓ Deliveries Service & Outflow PASSED.\n');

  // 8. Transfers Service Test
  console.log('Testing 8. Transfers Service (TRANSFER: source - qty, dest + qty)...');
  const targetLoc = await locationsService.create({
    warehouseId: newWh.id,
    warehouseName: newWh.name,
    name: 'Assembly Staging Rack 2',
    code: `${newWh.code}/STG-2`
  });

  const transfer = await transfersService.create({
    date: new Date().toISOString(),
    sourceWarehouseId: newWh.id,
    sourceWarehouseName: newWh.name,
    sourceLocationId: newLoc.id,
    sourceLocationName: newLoc.name,
    destinationWarehouseId: newWh.id,
    destinationWarehouseName: newWh.name,
    destinationLocationId: targetLoc.id,
    destinationLocationName: targetLoc.name,
    notes: 'Internal relocation test',
    items: [
      {
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        quantity: 10,
        unitOfMeasure: 'Boxes'
      }
    ],
    createdBy: adminUser.id,
    createdByName: adminUser.name
  });
  console.log(`  ✓ Created transfer: ${transfer.transferNumber}`);
  const transferValidation = await transfersService.validate(transfer.id, adminUser);
  console.log(`  ✓ Validated transfer: ${transferValidation.message}`);

  const srcBal = await getStockBalance(newProd.id, newLoc.id);
  const dstBal = await getStockBalance(newProd.id, targetLoc.id);
  const transferProd = await productsService.getById(newProd.id);
  console.log(`  ✓ Source location stock: ${srcBal?.quantity} (Expected: 15)`);
  console.log(`  ✓ Destination location stock: ${dstBal?.quantity} (Expected: 10)`);
  console.log(`  ✓ Product total catalog stock (constant): ${transferProd?.totalStock} (Expected: 75)`);
  if (srcBal?.quantity !== 15 || dstBal?.quantity !== 10 || transferProd?.totalStock !== 75) {
    throw new Error('Transfer formula verification failed');
  }
  console.log('  ✓ Transfers Service PASSED.\n');

  // 9. Adjustments Service Test
  console.log('Testing 9. Adjustments Service (ADJUSTMENT: newStock = physicalQty)...');
  const adjustment = await adjustmentsService.create({
    date: new Date().toISOString(),
    warehouseId: newWh.id,
    warehouseName: newWh.name,
    locationId: targetLoc.id,
    locationName: targetLoc.name,
    productId: newProd.id,
    productName: newProd.name,
    sku: newProd.sku,
    unitOfMeasure: 'Boxes',
    systemQuantity: 10,
    physicalQuantity: 12,
    reason: 'Physical count found 2 additional sealed boxes in aisle',
    createdBy: adminUser.id,
    createdByName: adminUser.name
  });
  console.log(`  ✓ Created adjustment: ${adjustment.adjustmentNumber} (Diff: ${adjustment.difference > 0 ? '+' : ''}${adjustment.difference})`);
  const adjValidation = await adjustmentsService.validate(adjustment.id, adminUser);
  console.log(`  ✓ Validated adjustment: ${adjValidation.message}`);

  const postAdjBalance = await getStockBalance(newProd.id, targetLoc.id);
  console.log(`  ✓ Location stock adjusted to: ${postAdjBalance?.quantity} (Expected: 12)`);
  if (postAdjBalance?.quantity !== 12) {
    throw new Error('Adjustment physical quantity formula failed');
  }
  console.log('  ✓ Adjustments Service PASSED.\n');

  // 10. Stock Ledger Immutability Test
  console.log('Testing 10. Stock Ledger Service & Audit Trail...');
  const ledgerEntries = await stockLedgerService.getAll();
  console.log(`  ✓ Total audit entries in ledger: ${ledgerEntries.length}`);
  const prodLedger = await stockLedgerService.getByProduct(newProd.id);
  console.log(`  ✓ Product specific audit trail: ${prodLedger.length} events logged.`);
  const hasReceipt = prodLedger.some(e => e.operationType === 'RECEIPT');
  const hasDelivery = prodLedger.some(e => e.operationType === 'DELIVERY');
  const hasTransfer = prodLedger.some(e => e.operationType === 'TRANSFER');
  const hasAdjustment = prodLedger.some(e => e.operationType === 'ADJUSTMENT_IN');
  if (!hasReceipt || !hasDelivery || !hasTransfer || !hasAdjustment) {
    throw new Error('Missing ledger event types in product audit history');
  }
  console.log('  ✓ Every operation created an immutable ledger entry.');
  console.log('  ✓ Stock Ledger Service PASSED.\n');

  // 11. Dashboard Service Test
  console.log('Testing 11. Dashboard Statistics Service...');
  const kpis = await dashboardService.getKPIs();
  console.log(`  ✓ Live KPIs calculated: Products=${kpis.totalProducts}, Units=${kpis.totalStockUnits}, LowStock=${kpis.lowStockItems}, PendingReceipts=${kpis.pendingReceipts}`);
  const valuations = await dashboardService.getValuationByCategory();
  console.log(`  ✓ Valuations calculated across ${valuations.length} categories.`);
  const occupancies = await dashboardService.getWarehouseOccupancies();
  console.log(`  ✓ Occupancies calculated across ${occupancies.length} warehouses.`);
  console.log('  ✓ Dashboard Statistics Service PASSED.\n');

  // 12. Concurrency Stress Test
  console.log('Testing 12. Concurrency & Race Condition Guard...');
  const raceResult = await runRaceConditionTest();
  console.log(`  ✓ Race Condition Guard Result: ${raceResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  ✓ Message: ${raceResult.message}`);
  if (!raceResult.passed) {
    throw new Error('Concurrency race condition guard failed!');
  }
  console.log('  ✓ Concurrency Test PASSED.\n');

  console.log('================================================================');
  console.log('🎉 ALL 12 SERVICES, STOCK ENGINE, & INVARIANTS PASSED PERFECTLY!');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
