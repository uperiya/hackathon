import { Warehouse, Location } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  deleteDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const warehousesService = {
  async getAll(): Promise<Warehouse[]> {
    return await getCollectionData<Warehouse>('warehouses');
  },

  async getById(id: string): Promise<Warehouse | null> {
    return await getDocumentData<Warehouse>('warehouses', id);
  },

  async create(data: { name: string; code: string; address: string; active?: boolean }): Promise<Warehouse> {
    const warehouses = await this.getAll();
    const existingCode = warehouses.find(w => w.code.toUpperCase() === data.code.trim().toUpperCase());
    if (existingCode) {
      throw new Error(`Warehouse with code '${data.code}' already exists.`);
    }

    const now = new Date().toISOString();
    const newWarehouse: Warehouse = {
      id: generateId('WH'),
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      address: data.address.trim(),
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    await setDocumentData('warehouses', newWarehouse.id, newWarehouse);
    return newWarehouse;
  },

  async update(id: string, updates: Partial<Warehouse>): Promise<Warehouse> {
    const warehouse = await this.getById(id);
    if (!warehouse) {
      throw new Error(`Warehouse not found: ${id}`);
    }

    if (updates.code && updates.code.toUpperCase() !== warehouse.code.toUpperCase()) {
      const warehouses = await this.getAll();
      const conflict = warehouses.find(w => w.id !== id && w.code.toUpperCase() === updates.code!.trim().toUpperCase());
      if (conflict) {
        throw new Error(`Warehouse code '${updates.code}' is already used by another warehouse.`);
      }
    }

    const updatedWarehouse: Warehouse = {
      ...warehouse,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDocumentData('warehouses', id, updatedWarehouse);
    return updatedWarehouse;
  },

  async delete(id: string): Promise<void> {
    const locations = await getCollectionData<Location>('locations');
    const associatedLocations = locations.filter(l => l.warehouseId === id);

    if (associatedLocations.length > 0) {
      throw new Error(
        `Cannot delete warehouse: It still contains ${associatedLocations.length} storage location(s). Delete or reassign the locations first.`
      );
    }

    await deleteDocumentData('warehouses', id);
  },

  subscribe(callback: (warehouses: Warehouse[]) => void): () => void {
    return subscribeToCollection<Warehouse>('warehouses', callback);
  }
};
