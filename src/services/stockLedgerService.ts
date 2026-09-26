import { StockLedgerEntry } from '../types';
import {
  getCollectionData,
  addDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

/**
 * Stock Ledger Service.
 * NOTE: This service maintains the immutable audit trail of all warehouse physical movements.
 * In accordance with ERP accounting and inventory compliance standards, records CANNOT be edited or deleted.
 */
export const stockLedgerService = {
  async getAll(): Promise<StockLedgerEntry[]> {
    const entries = await getCollectionData<StockLedgerEntry>('stockLedger');
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getByProduct(productId: string): Promise<StockLedgerEntry[]> {
    const all = await this.getAll();
    return all.filter(e => e.productId === productId);
  },

  async getByReference(referenceId: string): Promise<StockLedgerEntry[]> {
    const all = await this.getAll();
    return all.filter(e => e.referenceId === referenceId);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<StockLedgerEntry[]> {
    const all = await this.getAll();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return all.filter(e => {
      const time = new Date(e.createdAt).getTime();
      return time >= start && time <= end;
    });
  },

  async createEntry(entry: Omit<StockLedgerEntry, 'id' | 'createdAt'>): Promise<StockLedgerEntry> {
    const record: StockLedgerEntry = {
      ...entry,
      id: generateId('LEDG'),
      createdAt: new Date().toISOString()
    };

    await addDocumentData('stockLedger', record);
    return record;
  },

  subscribe(callback: (entries: StockLedgerEntry[]) => void): () => void {
    return subscribeToCollection<StockLedgerEntry>('stockLedger', (entries) => {
      const sorted = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(sorted);
    });
  }
};
