import { Adjustment, UserProfile, StockOperationResult } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';
import { getNextDocNumber } from '../lib/sequences';
import { adjustStock } from './stockEngine';

export const adjustmentsService = {
  async getAll(): Promise<Adjustment[]> {
    return await getCollectionData<Adjustment>('adjustments');
  },

  async getById(id: string): Promise<Adjustment | null> {
    return await getDocumentData<Adjustment>('adjustments', id);
  },

  async create(data: {
    date?: string;
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
    reason: string;
    notes?: string;
    createdBy?: string;
    createdByName?: string;
  }, user?: UserProfile): Promise<Adjustment> {
    if (user && !user.active) {
      throw new Error('Unauthorized: User account is inactive or not authenticated.');
    }

    const diff = Number(data.physicalQuantity) - Number(data.systemQuantity);
    const adjustmentNumber = await getNextDocNumber('ADJ');
    const now = new Date().toISOString();

    const newAdjustment: Adjustment = {
      id: generateId('ADJ'),
      adjustmentNumber,
      date: data.date || now,
      warehouseId: data.warehouseId,
      warehouseName: data.warehouseName,
      locationId: data.locationId,
      locationName: data.locationName,
      productId: data.productId,
      productName: data.productName,
      sku: data.sku,
      unitOfMeasure: data.unitOfMeasure,
      systemQuantity: Number(data.systemQuantity),
      physicalQuantity: Number(data.physicalQuantity),
      difference: diff,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || '',
      status: 'Draft',
      createdBy: data.createdBy || user?.id || 'admin',
      createdByName: data.createdByName || user?.name || 'Administrator',
      createdAt: now
    };

    await setDocumentData('adjustments', newAdjustment.id, newAdjustment);
    return newAdjustment;
  },

  async update(id: string, updates: Partial<Adjustment>): Promise<Adjustment> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Adjustment record not found: ${id}`);
    if (existing.status === 'Done') {
      throw new Error('Cannot modify a finalized stock adjustment.');
    }

    let difference = existing.difference;
    if (updates.physicalQuantity !== undefined || updates.systemQuantity !== undefined) {
      const phys = updates.physicalQuantity !== undefined ? Number(updates.physicalQuantity) : existing.physicalQuantity;
      const sys = updates.systemQuantity !== undefined ? Number(updates.systemQuantity) : existing.systemQuantity;
      difference = phys - sys;
    }

    const updated: Adjustment = {
      ...existing,
      ...updates,
      difference
    };

    await updateDocumentData('adjustments', id, updated);
    return updated;
  },

  async validate(id: string, user: UserProfile): Promise<StockOperationResult> {
    return await adjustStock(id, user);
  },

  async cancel(id: string): Promise<Adjustment> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Adjustment record not found: ${id}`);
    if (existing.status === 'Done') {
      throw new Error('Cannot cancel an already completed stock adjustment.');
    }

    const updated: Partial<Adjustment> = { status: 'Canceled' };
    await updateDocumentData('adjustments', id, updated);
    return { ...existing, ...updated };
  },

  subscribe(callback: (adjustments: Adjustment[]) => void): () => void {
    return subscribeToCollection<Adjustment>('adjustments', callback);
  }
};
