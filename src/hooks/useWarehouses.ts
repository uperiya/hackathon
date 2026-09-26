import { useState, useEffect, useCallback } from 'react';
import { Warehouse } from '../types';
import { warehousesService } from '../services/warehousesService';

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await warehousesService.getAll();
      setWarehouses(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
    const unsubscribe = warehousesService.subscribe((updated) => {
      setWarehouses(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchWarehouses]);

  const createWarehouse = async (data: { name: string; code: string; address: string; active?: boolean }) => {
    return await warehousesService.create(data);
  };

  const updateWarehouse = async (id: string, updates: Partial<Warehouse>) => {
    return await warehousesService.update(id, updates);
  };

  const deleteWarehouse = async (id: string) => {
    return await warehousesService.delete(id);
  };

  return {
    warehouses,
    loading,
    error,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    reload: fetchWarehouses
  };
}
