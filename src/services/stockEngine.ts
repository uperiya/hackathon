import {
  runTransaction,
  doc,
  collection
} from 'firebase/firestore';
import { db, isLiveFirebaseConfigured, isDemoMode } from '../lib/firebase';
import {
  Product,
  Receipt,
  Delivery,
  Transfer,
  Adjustment,
  StockBalance,
  StockLedgerEntry,
  UserProfile,
  StockOperationType,
  StockOperationResult,
  StockCheckItem
} from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  addDocumentData
} from '../lib/storage';
import { generateId } from '../lib/utils';
import { stockTransactionMutex } from '../lib/atomicLock';

function cleanDoc<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Validates user permissions for stock operations.
 */
function assertStockPermission(user: UserProfile, operation: string) {
  if (!user || !user.active) {
    throw new Error('Unauthorized: User account is inactive or not authenticated.');
  }
  if (!['Admin', 'Inventory Manager', 'Warehouse Staff'].includes(user.role)) {
    throw new Error(`Unauthorized: Role '${user.role}' lacks permission for '${operation}'.`);
  }
}

/**
 * Retrieves current stock balance for a product at a specific warehouse location.
 */
export async function getStockBalance(productId: string, locationId: string): Promise<StockBalance | null> {
  const balances = await getCollectionData<StockBalance>('stockBalances');
  return balances.find(b => b.productId === productId && b.locationId === locationId) || null;
}

/**
 * Retrieves all stock balances for a given product across all locations.
 */
export async function getProductStockBreakdown(productId: string): Promise<StockBalance[]> {
  const balances = await getCollectionData<StockBalance>('stockBalances');
  return balances.filter(b => b.productId === productId && b.quantity > 0);
}

/**
 * Checks stock availability for all items in a delivery order without committing changes.
 */
export async function checkDeliveryAvailability(deliveryId: string): Promise<{
  allAvailable: boolean;
  items: StockCheckItem[];
}> {
  const delivery = await getDocumentData<Delivery>('deliveries', deliveryId);
  if (!delivery) {
    throw new Error(`Delivery not found: ${deliveryId}`);
  }

  const items: StockCheckItem[] = [];
  let allAvailable = true;

  for (const item of delivery.items) {
    const balance = await getStockBalance(item.productId, delivery.sourceLocationId);
    const available = balance ? balance.quantity : 0;
    const isAvail = available >= item.quantity;
    if (!isAvail) allAvailable = false;

    items.push({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      locationId: delivery.sourceLocationId,
      locationName: delivery.sourceLocationName,
      requiredQuantity: item.quantity,
      availableQuantity: available,
      isAvailable: isAvail
    });
  }

  return { allAvailable, items };
}

/**
 * Checks stock availability for all items in a transfer order.
 */
export async function checkTransferAvailability(transferId: string): Promise<{
  allAvailable: boolean;
  items: StockCheckItem[];
}> {
  const transfer = await getDocumentData<Transfer>('transfers', transferId);
  if (!transfer) {
    throw new Error(`Transfer not found: ${transferId}`);
  }

  const items: StockCheckItem[] = [];
  let allAvailable = true;

  for (const item of transfer.items) {
    const balance = await getStockBalance(item.productId, transfer.sourceLocationId);
    const available = balance ? balance.quantity : 0;
    const isAvail = available >= item.quantity;
    if (!isAvail) allAvailable = false;

    items.push({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      locationId: transfer.sourceLocationId,
      locationName: transfer.sourceLocationName,
      requiredQuantity: item.quantity,
      availableQuantity: available,
      isAvailable: isAvail
    });
  }

  return { allAvailable, items };
}

// ============================================================================
// 1. RECEIPT TRANSACTION: stock + quantity
// ============================================================================
export async function receiveStock(receiptId: string, user: UserProfile): Promise<StockOperationResult> {
  assertStockPermission(user, 'Receipt Validation');

  return await stockTransactionMutex.runExclusive(async () => {
    // Live Firestore ACID Transaction Path
    if (isLiveFirebaseConfigured && !isDemoMode) {
      try {
        return await runTransaction(db, async (transaction) => {
          // --- 1. ALL READS FIRST ---
          const receiptRef = doc(db, 'receipts', receiptId);
          const receiptSnap = await transaction.get(receiptRef);
          if (!receiptSnap.exists()) {
            throw new Error(`Receipt not found: ${receiptId}`);
          }
          const receipt = { id: receiptSnap.id, ...receiptSnap.data() } as Receipt;

          if (receipt.status === 'Done') {
            throw new Error('This receipt has already been processed and marked Done.');
          }
          if (receipt.status === 'Canceled') {
            throw new Error('Cannot process a canceled receipt.');
          }
          if (!receipt.items || receipt.items.length === 0) {
            throw new Error('Receipt must contain at least one item.');
          }

          // Read all product and balance docs
          const productSnaps = [];
          const balanceSnaps = [];
          for (const item of receipt.items) {
            if (item.quantity <= 0) {
              throw new Error(`Item ${item.productName} must have a quantity > 0.`);
            }
            const prodRef = doc(db, 'products', item.productId);
            const balRef = doc(db, 'stockBalances', `${item.productId}_${receipt.destinationLocationId}`);
            productSnaps.push({ item, prodRef, snap: await transaction.get(prodRef) });
            balanceSnaps.push({ item, balRef, snap: await transaction.get(balRef) });
          }

          // --- 2. VALIDATE READS ---
          for (const { item, snap } of productSnaps) {
            if (!snap.exists()) {
              throw new Error(`Product not found in database: ${item.productId}`);
            }
          }

          // --- 3. ALL WRITES AFTER ---
          const ledgerEntries: StockLedgerEntry[] = [];
          const now = new Date().toISOString();

          for (let i = 0; i < receipt.items.length; i++) {
            const item = receipt.items[i];
            const prodData = productSnaps[i].snap.data() as Product;
            const balSnap = balanceSnaps[i].snap;
            const balData = balSnap.exists() ? (balSnap.data() as StockBalance) : null;

            const currentLocQty = balData ? (balData.quantity || 0) : 0;
            const newLocQty = currentLocQty + item.quantity;

            const currentTotal = prodData.totalStock || 0;
            const currentAvail = prodData.availableStock || 0;
            const newTotal = currentTotal + item.quantity;
            const newAvail = currentAvail + item.quantity;

            // Update Location Stock
            transaction.set(balanceSnaps[i].balRef, {
              id: `${item.productId}_${receipt.destinationLocationId}`,
              productId: item.productId,
              warehouseId: receipt.destinationWarehouseId,
              locationId: receipt.destinationLocationId,
              quantity: newLocQty,
              updatedAt: now
            }, { merge: true });

            // Update Product Master
            transaction.update(productSnaps[i].prodRef, {
              totalStock: newTotal,
              availableStock: newAvail,
              updatedAt: now
            });

            // Create Immutable Stock Ledger Record
            const ledgerRef = doc(collection(db, 'stockLedger'));
            const ledgerEntry: StockLedgerEntry = {
              id: ledgerRef.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              operationType: 'RECEIPT',
              referenceId: receipt.id,
              referenceNumber: receipt.receiptNumber,
              toWarehouseId: receipt.destinationWarehouseId,
              toWarehouseName: receipt.destinationWarehouseName,
              toLocationId: receipt.destinationLocationId,
              toLocationName: receipt.destinationLocationName,
              quantity: item.quantity,
              beforeQuantity: currentLocQty,
              afterQuantity: newLocQty,
              userId: user.id,
              userName: user.name,
              notes: receipt.notes || `Goods receipt from ${receipt.supplier}`,
              createdAt: now
            };
            transaction.set(ledgerRef, ledgerEntry);
            ledgerEntries.push(ledgerEntry);
          }

          // Mark Receipt Done
          transaction.update(receiptRef, {
            status: 'Done',
            validatedAt: now
          });

          return {
            success: true,
            message: `Receipt ${receipt.receiptNumber} successfully received and validated into stock.`,
            documentId: receipt.id,
            documentNumber: receipt.receiptNumber,
            ledgerEntries
          };
        });
      } catch (err: any) {
        if (err.message && (
          err.message.includes('already been') ||
          err.message.includes('Cannot process') ||
          err.message.includes('must have a quantity')
        )) {
          throw err;
        }
        console.warn('Firestore live transaction failed, falling back to local engine:', err.message);
      }
    }

    // Storage / Demo Mode Fallback (Atomic Mutex Serialized)
    const receipt = await getDocumentData<Receipt>('receipts', receiptId);
    if (!receipt) throw new Error(`Receipt not found: ${receiptId}`);

    if (receipt.status === 'Done') {
      throw new Error('This receipt has already been validated and marked Done.');
    }
    if (receipt.status === 'Canceled') {
      throw new Error('Cannot validate a canceled receipt.');
    }
    if (!receipt.items || receipt.items.length === 0) {
      throw new Error('Receipt must contain at least one item.');
    }

    const ledgerEntries: StockLedgerEntry[] = [];
    const now = new Date().toISOString();

    for (const item of receipt.items) {
      if (item.quantity <= 0) {
        throw new Error(`Item ${item.productName} must have a quantity > 0.`);
      }

      // Read current location balance
      const currentBalance = await getStockBalance(item.productId, receipt.destinationLocationId);
      const currentLocQty = currentBalance ? currentBalance.quantity : 0;
      const newLocQty = currentLocQty + item.quantity;

      // Update location balance
      const balanceRecord: StockBalance = {
        id: `${item.productId}_${receipt.destinationLocationId}`,
        productId: item.productId,
        warehouseId: receipt.destinationWarehouseId,
        locationId: receipt.destinationLocationId,
        quantity: newLocQty,
        updatedAt: now
      };
      await setDocumentData('stockBalances', balanceRecord.id, balanceRecord);

      // Read & update product catalog
      const product = await getDocumentData<Product>('products', item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const newTotal = (product.totalStock || 0) + item.quantity;
      const newAvail = (product.availableStock || 0) + item.quantity;

      await updateDocumentData('products', item.productId, {
        totalStock: newTotal,
        availableStock: newAvail,
        updatedAt: now
      });

      // Immutable Stock Ledger Entry
      const ledgerEntry: StockLedgerEntry = {
        id: generateId('LEDG'),
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        operationType: 'RECEIPT',
        referenceId: receipt.id,
        referenceNumber: receipt.receiptNumber,
        toWarehouseId: receipt.destinationWarehouseId,
        toWarehouseName: receipt.destinationWarehouseName,
        toLocationId: receipt.destinationLocationId,
        toLocationName: receipt.destinationLocationName,
        quantity: item.quantity,
        beforeQuantity: currentLocQty,
        afterQuantity: newLocQty,
        userId: user.id,
        userName: user.name,
        notes: receipt.notes || `Goods receipt from ${receipt.supplier}`,
        createdAt: now
      };
      await addDocumentData('stockLedger', ledgerEntry);
      ledgerEntries.push(ledgerEntry);
    }

    // Mark Receipt Done
    await updateDocumentData('receipts', receipt.id, {
      status: 'Done',
      validatedAt: now
    });

    return {
      success: true,
      message: `Receipt ${receipt.receiptNumber} successfully received and validated into stock.`,
      documentId: receipt.id,
      documentNumber: receipt.receiptNumber,
      ledgerEntries
    };
  });
}

// ============================================================================
// 2. DELIVERY TRANSACTION: stock - quantity (RACE CONDITION GUARDED)
// ============================================================================
export async function deliverStock(deliveryId: string, user: UserProfile): Promise<StockOperationResult> {
  assertStockPermission(user, 'Delivery Validation');

  return await stockTransactionMutex.runExclusive(async () => {
    // Live Firestore ACID Transaction Path
    if (isLiveFirebaseConfigured && !isDemoMode) {
      try {
        return await runTransaction(db, async (transaction) => {
          // --- 1. ALL READS FIRST ---
          const deliveryRef = doc(db, 'deliveries', deliveryId);
          const deliverySnap = await transaction.get(deliveryRef);
          if (!deliverySnap.exists()) {
            throw new Error(`Delivery order not found: ${deliveryId}`);
          }
          const delivery = { id: deliverySnap.id, ...deliverySnap.data() } as Delivery;

          if (delivery.status === 'Done') {
            throw new Error('This delivery order has already been processed and marked Done.');
          }
          if (delivery.status === 'Canceled') {
            throw new Error('Cannot process a canceled delivery order.');
          }
          if (!delivery.items || delivery.items.length === 0) {
            throw new Error('Delivery order must contain at least one item.');
          }

          // Read all product and balance docs
          const productSnaps = [];
          const balanceSnaps = [];
          for (const item of delivery.items) {
            if (item.quantity <= 0) {
              throw new Error(`Item ${item.productName} must have a quantity > 0.`);
            }
            const prodRef = doc(db, 'products', item.productId);
            const balRef = doc(db, 'stockBalances', `${item.productId}_${delivery.sourceLocationId}`);
            productSnaps.push({ item, prodRef, snap: await transaction.get(prodRef) });
            balanceSnaps.push({ item, balRef, snap: await transaction.get(balRef) });
          }

          // --- 2. VALIDATE STOCK BEFORE ANY WRITES (STRICT RACE CONDITION PREVENTION) ---
          for (let i = 0; i < delivery.items.length; i++) {
            const item = delivery.items[i];
            const prodSnap = productSnaps[i].snap;
            const balSnap = balanceSnaps[i].snap;

            if (!prodSnap.exists()) {
              throw new Error(`Product not found: ${item.productId}`);
            }
            const prodData = prodSnap.data() as Product;
            const balData = balSnap.exists() ? (balSnap.data() as StockBalance) : null;

            const currentLocQty = balData ? (balData.quantity || 0) : 0;
            if (currentLocQty < item.quantity) {
              throw new Error(
                `Insufficient stock for '${item.productName}' in location '${delivery.sourceLocationName}'. Available: ${currentLocQty}, Requested: ${item.quantity}`
              );
            }

            const currentAvail = prodData.availableStock || 0;
            if (currentAvail < item.quantity) {
              throw new Error(
                `Insufficient available stock for '${item.productName}'. Total Available: ${currentAvail}, Requested: ${item.quantity}`
              );
            }
          }

          // --- 3. ALL WRITES AFTER ---
          const ledgerEntries: StockLedgerEntry[] = [];
          const now = new Date().toISOString();

          for (let i = 0; i < delivery.items.length; i++) {
            const item = delivery.items[i];
            const prodData = productSnaps[i].snap.data() as Product;
            const balData = balanceSnaps[i].snap.data() as StockBalance;

            const currentLocQty = balData.quantity || 0;
            const newLocQty = currentLocQty - item.quantity;

            const currentTotal = prodData.totalStock || 0;
            const currentAvail = prodData.availableStock || 0;
            const newTotal = currentTotal - item.quantity;
            const newAvail = currentAvail - item.quantity;

            // Update Location Stock
            transaction.set(balanceSnaps[i].balRef, {
              id: `${item.productId}_${delivery.sourceLocationId}`,
              productId: item.productId,
              warehouseId: delivery.sourceWarehouseId,
              locationId: delivery.sourceLocationId,
              quantity: newLocQty,
              updatedAt: now
            }, { merge: true });

            // Update Product Catalog
            transaction.update(productSnaps[i].prodRef, {
              totalStock: newTotal,
              availableStock: newAvail,
              updatedAt: now
            });

            // Immutable Stock Ledger Record
            const ledgerRef = doc(collection(db, 'stockLedger'));
            const ledgerEntry: StockLedgerEntry = {
              id: ledgerRef.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              operationType: 'DELIVERY',
              referenceId: delivery.id,
              referenceNumber: delivery.deliveryNumber,
              fromWarehouseId: delivery.sourceWarehouseId,
              fromWarehouseName: delivery.sourceWarehouseName,
              fromLocationId: delivery.sourceLocationId,
              fromLocationName: delivery.sourceLocationName,
              quantity: item.quantity,
              beforeQuantity: currentLocQty,
              afterQuantity: newLocQty,
              userId: user.id,
              userName: user.name,
              notes: delivery.notes || `Dispatched to ${delivery.customer}`,
              createdAt: now
            };
            transaction.set(ledgerRef, ledgerEntry);
            ledgerEntries.push(ledgerEntry);
          }

          // Mark Delivery Done
          transaction.update(deliveryRef, {
            status: 'Done',
            validatedAt: now
          });

          return {
            success: true,
            message: `Delivery ${delivery.deliveryNumber} validated and dispatched successfully.`,
            documentId: delivery.id,
            documentNumber: delivery.deliveryNumber,
            ledgerEntries
          };
        });
      } catch (err: any) {
        if (err.message && (
          err.message.includes('Insufficient stock') ||
          err.message.includes('already been') ||
          err.message.includes('Cannot process') ||
          err.message.includes('must have a quantity')
        )) {
          throw err;
        }
        console.warn('Firestore live delivery transaction failed, falling back to local engine:', err.message);
      }
    }

    // Storage / Demo Mode Fallback (Atomic Mutex Serialized)
    const delivery = await getDocumentData<Delivery>('deliveries', deliveryId);
    if (!delivery) throw new Error(`Delivery not found: ${deliveryId}`);

    if (delivery.status === 'Done') {
      throw new Error('This delivery order has already been completed.');
    }
    if (delivery.status === 'Canceled') {
      throw new Error('Cannot validate a canceled delivery order.');
    }
    if (!delivery.items || delivery.items.length === 0) {
      throw new Error('Delivery must contain at least one item.');
    }

    // Phase 1: Availability Verification across all items first (Atomic Pre-check)
    for (const item of delivery.items) {
      if (item.quantity <= 0) {
        throw new Error(`Delivery item ${item.productName} must have a quantity > 0.`);
      }

      const currentBalance = await getStockBalance(item.productId, delivery.sourceLocationId);
      const available = currentBalance ? currentBalance.quantity : 0;

      if (available < item.quantity) {
        throw new Error(
          `Insufficient stock for '${item.productName}' in location '${delivery.sourceLocationName}'. Available: ${available}, Requested: ${item.quantity}`
        );
      }

      const product = await getDocumentData<Product>('products', item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if ((product.availableStock || 0) < item.quantity) {
        throw new Error(
          `Insufficient available stock for '${item.productName}'. Total Available: ${product.availableStock}, Requested: ${item.quantity}`
        );
      }
    }

    // Phase 2: Atomic Execution & Ledger Logging
    const ledgerEntries: StockLedgerEntry[] = [];
    const now = new Date().toISOString();

    for (const item of delivery.items) {
      const currentBalance = await getStockBalance(item.productId, delivery.sourceLocationId);
      const beforeQuantity = currentBalance ? currentBalance.quantity : 0;
      const afterQuantity = beforeQuantity - item.quantity;

      if (afterQuantity < 0) {
        throw new Error(`Negative stock violation: Available: ${beforeQuantity}, Requested: ${item.quantity}`);
      }

      // Update location balance
      const balanceRecord: StockBalance = {
        id: `${item.productId}_${delivery.sourceLocationId}`,
        productId: item.productId,
        warehouseId: delivery.sourceWarehouseId,
        locationId: delivery.sourceLocationId,
        quantity: afterQuantity,
        updatedAt: now
      };
      await setDocumentData('stockBalances', balanceRecord.id, balanceRecord);

      // Update product master
      const product = await getDocumentData<Product>('products', item.productId);
      if (product) {
        const newTotal = (product.totalStock || 0) - item.quantity;
        const newAvail = (product.availableStock || 0) - item.quantity;
        await updateDocumentData('products', item.productId, {
          totalStock: Math.max(0, newTotal),
          availableStock: Math.max(0, newAvail),
          updatedAt: now
        });
      }

      // Immutable Ledger Record
      const ledgerEntry: StockLedgerEntry = {
        id: generateId('LEDG'),
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        operationType: 'DELIVERY',
        referenceId: delivery.id,
        referenceNumber: delivery.deliveryNumber,
        fromWarehouseId: delivery.sourceWarehouseId,
        fromWarehouseName: delivery.sourceWarehouseName,
        fromLocationId: delivery.sourceLocationId,
        fromLocationName: delivery.sourceLocationName,
        quantity: item.quantity,
        beforeQuantity,
        afterQuantity,
        userId: user.id,
        userName: user.name,
        notes: delivery.notes || `Dispatched to ${delivery.customer}`,
        createdAt: now
      };
      await addDocumentData('stockLedger', ledgerEntry);
      ledgerEntries.push(ledgerEntry);
    }

    // Mark Delivery Done
    await updateDocumentData('deliveries', delivery.id, {
      status: 'Done',
      validatedAt: now
    });

    return {
      success: true,
      message: `Delivery ${delivery.deliveryNumber} validated and dispatched successfully.`,
      documentId: delivery.id,
      documentNumber: delivery.deliveryNumber,
      ledgerEntries
    };
  });
}

// ============================================================================
// 3. TRANSFER TRANSACTION: source - quantity, destination + quantity
// ============================================================================
export async function transferStock(transferId: string, user: UserProfile): Promise<StockOperationResult> {
  assertStockPermission(user, 'Internal Transfer Validation');

  return await stockTransactionMutex.runExclusive(async () => {
    // Live Firestore ACID Transaction Path
    if (isLiveFirebaseConfigured && !isDemoMode) {
      try {
        return await runTransaction(db, async (transaction) => {
          // --- 1. ALL READS FIRST ---
          const transferRef = doc(db, 'transfers', transferId);
          const transferSnap = await transaction.get(transferRef);
          if (!transferSnap.exists()) {
            throw new Error(`Transfer order not found: ${transferId}`);
          }
          const transfer = { id: transferSnap.id, ...transferSnap.data() } as Transfer;

          if (transfer.status === 'Done') {
            throw new Error('This transfer has already been completed.');
          }
          if (transfer.status === 'Canceled') {
            throw new Error('Cannot execute a canceled transfer.');
          }
          if (!transfer.items || transfer.items.length === 0) {
            throw new Error('Transfer must specify at least one product.');
          }

          const sourceBalSnaps = [];
          const destBalSnaps = [];
          for (const item of transfer.items) {
            if (item.quantity <= 0) {
              throw new Error(`Transfer item ${item.productName} must have a quantity > 0.`);
            }
            const srcBalRef = doc(db, 'stockBalances', `${item.productId}_${transfer.sourceLocationId}`);
            const dstBalRef = doc(db, 'stockBalances', `${item.productId}_${transfer.destinationLocationId}`);
            sourceBalSnaps.push({ item, ref: srcBalRef, snap: await transaction.get(srcBalRef) });
            destBalSnaps.push({ item, ref: dstBalRef, snap: await transaction.get(dstBalRef) });
          }

          // --- 2. VALIDATE SOURCE STOCK ---
          for (let i = 0; i < transfer.items.length; i++) {
            const item = transfer.items[i];
            const srcSnap = sourceBalSnaps[i].snap;
            const srcData = srcSnap.exists() ? (srcSnap.data() as StockBalance) : null;
            const available = srcData ? (srcData.quantity || 0) : 0;

            if (available < item.quantity) {
              throw new Error(
                `Insufficient source stock for '${item.productName}' in '${transfer.sourceLocationName}'. Available: ${available}, Requested: ${item.quantity}`
              );
            }
          }

          // --- 3. ALL WRITES AFTER ---
          const ledgerEntries: StockLedgerEntry[] = [];
          const now = new Date().toISOString();

          for (let i = 0; i < transfer.items.length; i++) {
            const item = transfer.items[i];
            const srcData = sourceBalSnaps[i].snap.data() as StockBalance;
            const dstSnap = destBalSnaps[i].snap;
            const dstData = dstSnap.exists() ? (dstSnap.data() as StockBalance) : null;

            const srcBefore = srcData.quantity || 0;
            const srcAfter = srcBefore - item.quantity;

            const dstBefore = dstData ? (dstData.quantity || 0) : 0;
            const dstAfter = dstBefore + item.quantity;

            // Deduct from Source Location
            transaction.set(sourceBalSnaps[i].ref, {
              id: `${item.productId}_${transfer.sourceLocationId}`,
              productId: item.productId,
              warehouseId: transfer.sourceWarehouseId,
              locationId: transfer.sourceLocationId,
              quantity: srcAfter,
              updatedAt: now
            }, { merge: true });

            // Add to Destination Location
            transaction.set(destBalSnaps[i].ref, {
              id: `${item.productId}_${transfer.destinationLocationId}`,
              productId: item.productId,
              warehouseId: transfer.destinationWarehouseId,
              locationId: transfer.destinationLocationId,
              quantity: dstAfter,
              updatedAt: now
            }, { merge: true });

            // Note: Total company stock is unchanged for internal transfer!

            // Immutable Ledger Entry
            const ledgerRef = doc(collection(db, 'stockLedger'));
            const ledgerEntry: StockLedgerEntry = {
              id: ledgerRef.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              operationType: 'TRANSFER',
              referenceId: transfer.id,
              referenceNumber: transfer.transferNumber,
              fromWarehouseId: transfer.sourceWarehouseId,
              fromWarehouseName: transfer.sourceWarehouseName,
              fromLocationId: transfer.sourceLocationId,
              fromLocationName: transfer.sourceLocationName,
              toWarehouseId: transfer.destinationWarehouseId,
              toWarehouseName: transfer.destinationWarehouseName,
              toLocationId: transfer.destinationLocationId,
              toLocationName: transfer.destinationLocationName,
              quantity: item.quantity,
              beforeQuantity: srcBefore,
              afterQuantity: srcAfter,
              userId: user.id,
              userName: user.name,
              notes: transfer.notes || `Internal transfer ${transfer.sourceWarehouseName} -> ${transfer.destinationWarehouseName}`,
              createdAt: now
            };
            transaction.set(ledgerRef, ledgerEntry);
            ledgerEntries.push(ledgerEntry);
          }

          // Mark Transfer Done
          transaction.update(transferRef, {
            status: 'Done',
            validatedAt: now
          });

          return {
            success: true,
            message: `Transfer ${transfer.transferNumber} completed successfully.`,
            documentId: transfer.id,
            documentNumber: transfer.transferNumber,
            ledgerEntries
          };
        });
      } catch (err: any) {
        if (err.message && (
          err.message.includes('Insufficient source stock') ||
          err.message.includes('already been') ||
          err.message.includes('Cannot execute') ||
          err.message.includes('must specify')
        )) {
          throw err;
        }
        console.warn('Firestore live transfer transaction failed, falling back to local engine:', err.message);
      }
    }

    // Storage / Demo Mode Fallback (Atomic Mutex Serialized)
    const transfer = await getDocumentData<Transfer>('transfers', transferId);
    if (!transfer) throw new Error(`Transfer order not found: ${transferId}`);

    if (transfer.status === 'Done') {
      throw new Error('This transfer has already been completed.');
    }
    if (transfer.status === 'Canceled') {
      throw new Error('Cannot execute a canceled transfer.');
    }
    if (!transfer.items || transfer.items.length === 0) {
      throw new Error('Transfer must specify at least one product.');
    }

    // Pre-check source stock availability
    for (const item of transfer.items) {
      if (item.quantity <= 0) {
        throw new Error(`Transfer item ${item.productName} must have a quantity > 0.`);
      }

      const currentBalance = await getStockBalance(item.productId, transfer.sourceLocationId);
      const available = currentBalance ? currentBalance.quantity : 0;

      if (available < item.quantity) {
        throw new Error(
          `Insufficient source stock for '${item.productName}' in '${transfer.sourceLocationName}'. Available: ${available}, Requested: ${item.quantity}`
        );
      }
    }

    const ledgerEntries: StockLedgerEntry[] = [];
    const now = new Date().toISOString();

    for (const item of transfer.items) {
      // Deduct from Source
      const srcBalance = await getStockBalance(item.productId, transfer.sourceLocationId);
      const srcBefore = srcBalance ? srcBalance.quantity : 0;
      const srcAfter = srcBefore - item.quantity;

      const srcRecord: StockBalance = {
        id: `${item.productId}_${transfer.sourceLocationId}`,
        productId: item.productId,
        warehouseId: transfer.sourceWarehouseId,
        locationId: transfer.sourceLocationId,
        quantity: srcAfter,
        updatedAt: now
      };
      await setDocumentData('stockBalances', srcRecord.id, srcRecord);

      // Add to Destination
      const dstBalance = await getStockBalance(item.productId, transfer.destinationLocationId);
      const dstBefore = dstBalance ? dstBalance.quantity : 0;
      const dstAfter = dstBefore + item.quantity;

      const dstRecord: StockBalance = {
        id: `${item.productId}_${transfer.destinationLocationId}`,
        productId: item.productId,
        warehouseId: transfer.destinationWarehouseId,
        locationId: transfer.destinationLocationId,
        quantity: dstAfter,
        updatedAt: now
      };
      await setDocumentData('stockBalances', dstRecord.id, dstRecord);

      const ledgerEntry: StockLedgerEntry = {
        id: generateId('LEDG'),
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        operationType: 'TRANSFER',
        referenceId: transfer.id,
        referenceNumber: transfer.transferNumber,
        fromWarehouseId: transfer.sourceWarehouseId,
        fromWarehouseName: transfer.sourceWarehouseName,
        fromLocationId: transfer.sourceLocationId,
        fromLocationName: transfer.sourceLocationName,
        toWarehouseId: transfer.destinationWarehouseId,
        toWarehouseName: transfer.destinationWarehouseName,
        toLocationId: transfer.destinationLocationId,
        toLocationName: transfer.destinationLocationName,
        quantity: item.quantity,
        beforeQuantity: srcBefore,
        afterQuantity: srcAfter,
        userId: user.id,
        userName: user.name,
        notes: transfer.notes || `Internal transfer ${transfer.sourceWarehouseName} -> ${transfer.destinationWarehouseName}`,
        createdAt: now
      };
      await addDocumentData('stockLedger', ledgerEntry);
      ledgerEntries.push(ledgerEntry);
    }

    // Mark Transfer Done
    await updateDocumentData('transfers', transfer.id, {
      status: 'Done',
      validatedAt: now
    });

    return {
      success: true,
      message: `Transfer ${transfer.transferNumber} completed successfully.`,
      documentId: transfer.id,
      documentNumber: transfer.transferNumber,
      ledgerEntries
    };
  });
}

// ============================================================================
// 4. ADJUSTMENT TRANSACTION: newStock = physicalQuantity
// ============================================================================
export async function adjustStock(adjustmentId: string, user: UserProfile): Promise<StockOperationResult> {
  assertStockPermission(user, 'Inventory Adjustment Validation');

  return await stockTransactionMutex.runExclusive(async () => {
    // Live Firestore ACID Transaction Path
    if (isLiveFirebaseConfigured && !isDemoMode) {
      try {
        return await runTransaction(db, async (transaction) => {
          // --- 1. ALL READS FIRST ---
          const adjRef = doc(db, 'adjustments', adjustmentId);
          const adjSnap = await transaction.get(adjRef);
          if (!adjSnap.exists()) {
            throw new Error(`Adjustment record not found: ${adjustmentId}`);
          }
          const adj = { id: adjSnap.id, ...adjSnap.data() } as Adjustment;

          if (adj.status === 'Done') {
            throw new Error('This stock adjustment is already finalized.');
          }
          if (adj.status === 'Canceled') {
            throw new Error('Cannot execute a canceled stock adjustment.');
          }

          const balRef = doc(db, 'stockBalances', `${adj.productId}_${adj.locationId}`);
          const balSnap = await transaction.get(balRef);
          const prodRef = doc(db, 'products', adj.productId);
          const prodSnap = await transaction.get(prodRef);

          if (!prodSnap.exists()) {
            throw new Error(`Product not found: ${adj.productId}`);
          }

          // --- 2. VALIDATE & CALCULATE ---
          const balData = balSnap.exists() ? (balSnap.data() as StockBalance) : null;
          const currentLocQty = balData ? (balData.quantity || 0) : 0;
          const prodData = prodSnap.data() as Product;

          const physicalQuantity = Number(adj.physicalQuantity);
          const systemQuantity = Number(adj.systemQuantity);
          const difference = physicalQuantity - systemQuantity;

          if (currentLocQty + difference < 0) {
            throw new Error(
              `Cannot adjust stock below 0. Current: ${currentLocQty}, Adjustment Delta: ${difference}`
            );
          }

          const newTotal = (prodData.totalStock || 0) + difference;
          const newAvail = (prodData.availableStock || 0) + difference;
          if (newTotal < 0 || newAvail < 0) {
            throw new Error(
              `Negative stock violation for '${prodData.name}'. Product total would be: ${newTotal}`
            );
          }

          // --- 3. ALL WRITES AFTER ---
          const now = new Date().toISOString();

          // Location balance set to physicalQuantity
          transaction.set(balRef, {
            id: `${adj.productId}_${adj.locationId}`,
            productId: adj.productId,
            warehouseId: adj.warehouseId,
            locationId: adj.locationId,
            quantity: physicalQuantity,
            updatedAt: now
          }, { merge: true });

          // Product Catalog total adjusted by difference
          transaction.update(prodRef, {
            totalStock: newTotal,
            availableStock: newAvail,
            updatedAt: now
          });

          const operationType: StockOperationType = difference >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

          // Immutable Ledger Entry
          const ledgerRef = doc(collection(db, 'stockLedger'));
          const ledgerEntry: StockLedgerEntry = {
            id: ledgerRef.id,
            productId: adj.productId,
            productName: adj.productName,
            sku: adj.sku,
            operationType,
            referenceId: adj.id,
            referenceNumber: adj.adjustmentNumber,
            fromWarehouseId: difference < 0 ? adj.warehouseId : undefined,
            fromWarehouseName: difference < 0 ? adj.warehouseName : undefined,
            fromLocationId: difference < 0 ? adj.locationId : undefined,
            fromLocationName: difference < 0 ? adj.locationName : undefined,
            toWarehouseId: difference > 0 ? adj.warehouseId : undefined,
            toWarehouseName: difference > 0 ? adj.warehouseName : undefined,
            toLocationId: difference > 0 ? adj.locationId : undefined,
            toLocationName: difference > 0 ? adj.locationName : undefined,
            quantity: Math.abs(difference),
            beforeQuantity: currentLocQty,
            afterQuantity: physicalQuantity,
            userId: user.id,
            userName: user.name,
            notes: `Physical count adjusted to ${physicalQuantity} (delta: ${difference}). Reason: ${adj.reason}`,
            createdAt: now
          };
          transaction.set(ledgerRef, cleanDoc(ledgerEntry));

          // Mark Adjustment Done
          transaction.update(adjRef, {
            status: 'Done',
            difference,
            validatedAt: now
          });

          return {
            success: true,
            message: `Stock adjustment ${adj.adjustmentNumber} successfully posted (${difference >= 0 ? '+' : ''}${difference} ${adj.unitOfMeasure}).`,
            documentId: adj.id,
            documentNumber: adj.adjustmentNumber,
            ledgerEntries: [ledgerEntry]
          };
        });
      } catch (err: any) {
        if (err.message && (
          err.message.includes('Cannot adjust stock below 0') ||
          err.message.includes('already finalized') ||
          err.message.includes('Cannot execute') ||
          err.message.includes('Negative stock')
        )) {
          throw err;
        }
        console.warn('Firestore live adjustment transaction failed, falling back to local engine:', err.message);
      }
    }

    // Storage / Demo Mode Fallback (Atomic Mutex Serialized)
    const adj = await getDocumentData<Adjustment>('adjustments', adjustmentId);
    if (!adj) throw new Error(`Adjustment record not found: ${adjustmentId}`);

    if (adj.status === 'Done') {
      throw new Error('This stock adjustment is already finalized and cannot be edited.');
    }
    if (adj.status === 'Canceled') {
      throw new Error('Cannot execute a canceled stock adjustment.');
    }

    const difference = Number(adj.physicalQuantity) - Number(adj.systemQuantity);
    const now = new Date().toISOString();

    const currentBalance = await getStockBalance(adj.productId, adj.locationId);
    const currentLocQty = currentBalance ? currentBalance.quantity : 0;

    if (currentLocQty + difference < 0) {
      throw new Error(
        `Cannot adjust stock below 0. Current: ${currentLocQty}, Adjustment Delta: ${difference}`
      );
    }

    // Update location balance: newStock = physicalQuantity
    const balanceRecord: StockBalance = {
      id: `${adj.productId}_${adj.locationId}`,
      productId: adj.productId,
      warehouseId: adj.warehouseId,
      locationId: adj.locationId,
      quantity: Number(adj.physicalQuantity),
      updatedAt: now
    };
    await setDocumentData('stockBalances', balanceRecord.id, balanceRecord);

    // Update product totals
    const product = await getDocumentData<Product>('products', adj.productId);
    if (product) {
      const newTotal = Math.max(0, (product.totalStock || 0) + difference);
      const newAvail = Math.max(0, (product.availableStock || 0) + difference);
      await updateDocumentData('products', adj.productId, {
        totalStock: newTotal,
        availableStock: newAvail,
        updatedAt: now
      });
    }

    const operationType: StockOperationType = difference >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

    const ledgerEntry: StockLedgerEntry = {
      id: generateId('LEDG'),
      productId: adj.productId,
      productName: adj.productName,
      sku: adj.sku,
      operationType,
      referenceId: adj.id,
      referenceNumber: adj.adjustmentNumber,
      fromWarehouseId: difference < 0 ? adj.warehouseId : undefined,
      fromWarehouseName: difference < 0 ? adj.warehouseName : undefined,
      fromLocationId: difference < 0 ? adj.locationId : undefined,
      fromLocationName: difference < 0 ? adj.locationName : undefined,
      toWarehouseId: difference > 0 ? adj.warehouseId : undefined,
      toWarehouseName: difference > 0 ? adj.warehouseName : undefined,
      toLocationId: difference > 0 ? adj.locationId : undefined,
      toLocationName: difference > 0 ? adj.locationName : undefined,
      quantity: Math.abs(difference),
      beforeQuantity: currentLocQty,
      afterQuantity: Number(adj.physicalQuantity),
      userId: user.id,
      userName: user.name,
      notes: `Physical Count: ${adj.physicalQuantity}, System: ${adj.systemQuantity}. Reason: ${adj.reason}`,
      createdAt: now
    };
    await addDocumentData('stockLedger', cleanDoc(ledgerEntry));

    // Mark adjustment Done
    await updateDocumentData('adjustments', adj.id, {
      status: 'Done',
      difference,
      validatedAt: now
    });

    return {
      success: true,
      message: `Stock adjustment ${adj.adjustmentNumber} successfully posted (${difference >= 0 ? '+' : ''}${difference} ${adj.unitOfMeasure}).`,
      documentId: adj.id,
      documentNumber: adj.adjustmentNumber,
      ledgerEntries: [ledgerEntry]
    };
  });
}
