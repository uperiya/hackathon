import { Location, Warehouse, StockBalance } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  deleteDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const locationsService = {
  async getAll(): Promise<Location[]> {
    const [locations, warehouses] = await Promise.all([
      getCollectionData<Location>('locations'),
      getCollectionData<Warehouse>('warehouses')
    ]);

    // Ensure warehouseName is populated
    return locations.map(loc => {
      const wh = warehouses.find(w => w.id === loc.warehouseId);
      return {
        ...loc,
        warehouseName: wh ? wh.name : loc.warehouseName || 'Unknown Warehouse'
      };
    });
  },

  async getById(id: string): Promise<Location | null> {
    const location = await getDocumentData<Location>('locations', id);
    if (!location) return null;

    if (!location.warehouseName) {
      const wh = await getDocumentData<Warehouse>('warehouses', location.warehouseId);
      if (wh) location.warehouseName = wh.name;
    }
    return location;
  },

  async getByWarehouse(warehouseId: string): Promise<Location[]> {
    const locations = await this.getAll();
    return locations.filter(l => l.warehouseId === warehouseId && l.active);
  },

  async create(data: {
    warehouseId: string;
    warehouseName?: string;
    name: string;
    code: string;
    active?: boolean;
  }): Promise<Location> {
    let warehouseName = data.warehouseName;
    if (!warehouseName) {
      const wh = await getDocumentData<Warehouse>('warehouses', data.warehouseId);
      warehouseName = wh ? wh.name : 'Main Warehouse';
    }

    const locations = await getCollectionData<Location>('locations');
    const existing = locations.find(
      l => l.warehouseId === data.warehouseId && l.code.toUpperCase() === data.code.trim().toUpperCase()
    );
    if (existing) {
      throw new Error(`Location code '${data.code}' already exists in warehouse '${warehouseName}'.`);
    }

    const newLocation: Location = {
      id: generateId('LOC'),
      warehouseId: data.warehouseId,
      warehouseName,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      active: data.active ?? true,
      createdAt: new Date().toISOString()
    };

    await setDocumentData('locations', newLocation.id, newLocation);
    return newLocation;
  },

  async update(id: string, updates: Partial<Location>): Promise<Location> {
    const location = await this.getById(id);
    if (!location) {
      throw new Error(`Location not found: ${id}`);
    }

    const updatedLocation: Location = {
      ...location,
      ...updates
    };

    await updateDocumentData('locations', id, updatedLocation);
    return updatedLocation;
  },

  async delete(id: string): Promise<void> {
    const balances = await getCollectionData<StockBalance>('stockBalances');
    const locationBalances = balances.filter(b => b.locationId === id && b.quantity > 0);

    if (locationBalances.length > 0) {
      const totalUnits = locationBalances.reduce((sum, b) => sum + b.quantity, 0);
      throw new Error(
        `Cannot delete location: It currently holds ${totalUnits} active inventory units across ${locationBalances.length} item(s). Transfer or adjust stock first.`
      );
    }

    await deleteDocumentData('locations', id);
  },

  subscribe(callback: (locations: Location[]) => void): () => void {
    return subscribeToCollection<Location>('locations', async (locs) => {
      const warehouses = await getCollectionData<Warehouse>('warehouses');
      const enriched = locs.map(loc => {
        const wh = warehouses.find(w => w.id === loc.warehouseId);
        return {
          ...loc,
          warehouseName: wh ? wh.name : loc.warehouseName || 'Unknown Warehouse'
        };
      });
      callback(enriched);
    });
  }
};
