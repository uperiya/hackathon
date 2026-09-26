import { useState, useEffect, useCallback } from 'react';
import { Adjustment, UserProfile } from '../types';
import { adjustmentsService } from '../services/adjustmentsService';

export function useAdjustments() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adjustmentsService.getAll();
      setAdjustments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdjustments();
    const unsubscribe = adjustmentsService.subscribe((updated) => {
      setAdjustments(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAdjustments]);

  const createAdjustment = async (data: Parameters<typeof adjustmentsService.create>[0]) => {
    return await adjustmentsService.create(data);
  };

  const updateAdjustment = async (id: string, updates: Partial<Adjustment>) => {
    return await adjustmentsService.update(id, updates);
  };

  const validateAdjustment = async (id: string, user: UserProfile) => {
    return await adjustmentsService.validate(id, user);
  };

  const cancelAdjustment = async (id: string) => {
    return await adjustmentsService.cancel(id);
  };

  return {
    adjustments,
    loading,
    error,
    createAdjustment,
    updateAdjustment,
    validateAdjustment,
    cancelAdjustment,
    reload: fetchAdjustments
  };
}
