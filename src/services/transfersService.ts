import { Transfer, UserProfile, StockOperationResult, StockCheckItem } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';
import { getNextDocNumber } from '../lib/sequences';
import { transferStock, checkTransferAvailability } from './stockEngine';

export const transfersService = {
  async getAll(): Promise<Transfer[]> {
    return await getCollectionData<Transfer>('transfers');
  },

  async getById(id: string): Promise<Transfer | null> {
    return await getDocumentData<Transfer>('transfers', id);
  },

  async create(data: {
    date?: string;
    sourceWarehouseId: string;
    sourceWarehouseName: string;
    sourceLocationId: string;
    sourceLocationName: string;
    destinationWarehouseId: string;
    destinationWarehouseName: string;
    destinationLocationId: string;
    destinationLocationName: string;
    notes?: string;
    items: Transfer['items'];
    status?: Transfer['status'];
    createdBy?: string;
    createdByName?: string;
  }, user?: UserProfile): Promise<Transfer> {
    if (user && !user.active) {
      throw new Error('Unauthorized: User account is inactive or not authenticated.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Transfer order must specify at least one product.');
    }

    if (data.sourceLocationId === data.destinationLocationId) {
      throw new Error('Source location and Destination location cannot be the same.');
    }

    const transferNumber = await getNextDocNumber('TRF');
    const now = new Date().toISOString();

    const newTransfer: Transfer = {
      id: generateId('TRF'),
      transferNumber,
      date: data.date || now,
      sourceWarehouseId: data.sourceWarehouseId,
      sourceWarehouseName: data.sourceWarehouseName,
      sourceLocationId: data.sourceLocationId,
      sourceLocationName: data.sourceLocationName,
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

    await setDocumentData('transfers', newTransfer.id, newTransfer);
    return newTransfer;
  },

  async update(id: string, updates: Partial<Transfer>): Promise<Transfer> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Transfer order not found: ${id}`);
    if (existing.status === 'Done') {
      throw new Error('Cannot edit an already completed internal transfer.');
    }

    const updated: Transfer = {
      ...existing,
      ...updates
    };

    await updateDocumentData('transfers', id, updated);
    return updated;
  },

  async checkAvailability(id: string): Promise<{ allAvailable: boolean; items: StockCheckItem[] }> {
    return await checkTransferAvailability(id);
  },

  async validate(id: string, user: UserProfile): Promise<StockOperationResult> {
    return await transferStock(id, user);
  },

  async cancel(id: string): Promise<Transfer> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Transfer order not found: ${id}`);
    if (existing.status === 'Done') {
      throw new Error('Cannot cancel a validated transfer order.');
    }

    const updated: Partial<Transfer> = { status: 'Canceled' };
    await updateDocumentData('transfers', id, updated);
    return { ...existing, ...updated };
  },

  subscribe(callback: (transfers: Transfer[]) => void): () => void {
    return subscribeToCollection<Transfer>('transfers', callback);
  }
};
