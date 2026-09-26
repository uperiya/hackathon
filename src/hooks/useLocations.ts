import { useState, useEffect, useCallback } from 'react';
import { Location } from '../types';
import { locationsService } from '../services/locationsService';

export function useLocations(warehouseId?: string) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = warehouseId
        ? await locationsService.getByWarehouse(warehouseId)
        : await locationsService.getAll();
      setLocations(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchLocations();
    const unsubscribe = locationsService.subscribe((updated) => {
      const filtered = warehouseId ? updated.filter(l => l.warehouseId === warehouseId) : updated;
      setLocations(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchLocations, warehouseId]);

  const createLocation = async (data: {
    warehouseId: string;
    warehouseName?: string;
    name: string;
    code: string;
    active?: boolean;
  }) => {
    return await locationsService.create(data);
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    return await locationsService.update(id, updates);
  };

  const deleteLocation = async (id: string) => {
    return await locationsService.delete(id);
  };

  return {
    locations,
    loading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
    reload: fetchLocations
  };
}
