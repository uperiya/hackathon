import { useState, useEffect, useCallback } from 'react';
import { Delivery, UserProfile } from '../types';
import { deliveriesService } from '../services/deliveriesService';

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveriesService.getAll();
      setDeliveries(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
    const unsubscribe = deliveriesService.subscribe((updated) => {
      setDeliveries(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchDeliveries]);

  const createDelivery = async (data: Parameters<typeof deliveriesService.create>[0]) => {
    return await deliveriesService.create(data);
  };

  const updateDelivery = async (id: string, updates: Partial<Delivery>) => {
    return await deliveriesService.update(id, updates);
  };

  const checkAvailability = async (id: string) => {
    return await deliveriesService.checkAvailability(id);
  };

  const validateDelivery = async (id: string, user: UserProfile) => {
    return await deliveriesService.validate(id, user);
  };

  const cancelDelivery = async (id: string) => {
    return await deliveriesService.cancel(id);
  };

  return {
    deliveries,
    loading,
    error,
    createDelivery,
    updateDelivery,
    checkAvailability,
    validateDelivery,
    cancelDelivery,
    reload: fetchDeliveries
  };
}
