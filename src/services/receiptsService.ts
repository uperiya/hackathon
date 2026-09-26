import { Receipt, UserProfile, StockOperationResult } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';
import { getNextDocNumber } from '../lib/sequences';
import { receiveStock } from './stockEngine';

export const receiptsService = {
  async getAll(): Promise<Receipt[]> {
    return await getCollectionData<Receipt>('receipts');
  },

  async getById(id: string): Promise<Receipt | null> {
    return await getDocumentData<Receipt>('receipts', id);
  },

  async create(data: {
    supplier: string;
    date?: string;
    destinationWarehouseId: string;
    destinationWarehouseName: string;
    destinationLocationId: string;
    destinationLocationName: string;
    notes?: string;
    items: Receipt['items'];
    status?: Receipt['status'];
    createdBy?: string;
    createdByName?: string;
  }, user?: UserProfile): Promise<Receipt> {
    if (user && !user.active) {
      throw new Error('Unauthorized: User account is inactive or not authenticated.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Receipt must contain at least one product line.');
    }

    const receiptNumber = await getNextDocNumber('REC');
    const now = new Date().toISOString();

    const newReceipt: Receipt = {
      id: generateId('REC'),
      receiptNumber,
      supplier: data.supplier.trim(),
      date: data.date || now,
      destinationWarehouseId: data.destinationWarehouseId,
      destinationWarehouseName: data.destinationWarehouseName,
      destinationLocationId: data.destinationLocationId,
      destinationLocationName: data.destinationLocationName,
      notes: data.notes?.trim() || '',
      status: data.status || 'Draft',
      items: data.items,
      createdBy: data.createdBy || user?.id || 'admin',
      createdByName: data.createdByName || user?.name || 'Administrator',
      createdAt: now
    };

    await setDocumentData('receipts', newReceipt.id, newReceipt);
    return newReceipt;
  },

  async update(id: string, updates: Partial<Receipt>): Promise<Receipt> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Receipt not found: ${id}`);
    }
    if (existing.status === 'Done') {
      throw new Error('Cannot modify a validated and completed receipt order.');
    }

    const updated: Receipt = {
      ...existing,
      ...updates
    };

    await updateDocumentData('receipts', id, updated);
    return updated;
  },

  async validate(id: string, user: UserProfile): Promise<StockOperationResult> {
    return await receiveStock(id, user);
  },

  async cancel(id: string): Promise<Receipt> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Receipt not found: ${id}`);
    if (existing.status === 'Done') {
      throw new Error('Cannot cancel a validated receipt order. Please create a return or adjustment instead.');
    }

    const updated: Partial<Receipt> = { status: 'Canceled' };
    await updateDocumentData('receipts', id, updated);
    return { ...existing, ...updated };
  },

  subscribe(callback: (receipts: Receipt[]) => void): () => void {
    return subscribeToCollection<Receipt>('receipts', callback);
  }
};
