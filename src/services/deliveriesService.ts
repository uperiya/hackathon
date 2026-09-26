import { Delivery, UserProfile, StockOperationResult, StockCheckItem } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';
import { getNextDocNumber } from '../lib/sequences';
import { deliverStock, checkDeliveryAvailability } from './stockEngine';

export const deliveriesService = {
  async getAll(): Promise<Delivery[]> {
    return await getCollectionData<Delivery>('deliveries');
  },

  async getById(id: string): Promise<Delivery | null> {
    return await getDocumentData<Delivery>('deliveries', id);
  },

  async create(data: {
    customer: string;
    date?: string;
    sourceWarehouseId: string;
    sourceWarehouseName: string;
    sourceLocationId: string;
    sourceLocationName: string;
    notes?: string;
    items: Delivery['items'];
    status?: Delivery['status'];
    createdBy?: string;
    createdByName?: string;
  }, user?: UserProfile): Promise<Delivery> {
    if (user && !user.active) {
      throw new Error('Unauthorized: User account is inactive or not authenticated.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Delivery order must contain at least one product line.');
    }

    const deliveryNumber = await getNextDocNumber('DEL');
    const now = new Date().toISOString();

    const newDelivery: Delivery = {
      id: generateId('DEL'),
      deliveryNumber,
      customer: data.customer.trim(),
      date: data.date || now,
      sourceWarehouseId: data.sourceWarehouseId,
      sourceWarehouseName: data.sourceWarehouseName,
      sourceLocationId: data.sourceLocationId,
      sourceLocationName: data.sourceLocationName,
      notes: data.notes?.trim() || '',
      status: data.status || 'Draft',
      items: data.items,
      createdBy: data.createdBy || user?.id || 'admin',
      createdByName: data.createdByName || user?.name || 'Administrator',
      createdAt: now
    };

    await setDocumentData('deliveries', newDelivery.id, newDelivery);
    return newDelivery;
  },

  async update(id: string, updates: Partial<Delivery>): Promise<Delivery> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Delivery order not found: ${id}`);
    }
    if (existing.status === 'Done') {
      throw new Error('Cannot modify a completed delivery order.');
    }

    const updated: Delivery = {
      ...existing,
      ...updates
    };

    await updateDocumentData('deliveries', id, updated);
    return updated;
  },

  async checkAvailability(id: string): Promise<{ allAvailable: boolean; items: StockCheckItem[] }> {
    return await checkDeliveryAvailability(id);
  },

  async validate(id: string, user: UserProfile): Promise<StockOperationResult> {
    return await deliverStock(id, user);
  },

  async cancel(id: string): Promise<Delivery> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Delivery order not found: ${id}`);
    if (existing.status === 'Done') {
      throw new Error('Cannot cancel an already completed delivery order.');
    }

    const updated: Partial<Delivery> = { status: 'Canceled' };
    await updateDocumentData('deliveries', id, updated);
    return { ...existing, ...updated };
  },

  subscribe(callback: (deliveries: Delivery[]) => void): () => void {
    return subscribeToCollection<Delivery>('deliveries', callback);
  }
};
