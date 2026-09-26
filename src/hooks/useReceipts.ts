import { useState, useEffect, useCallback } from 'react';
import { Receipt, UserProfile } from '../types';
import { receiptsService } from '../services/receiptsService';

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await receiptsService.getAll();
      setReceipts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
    const unsubscribe = receiptsService.subscribe((updated) => {
      setReceipts(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchReceipts]);

  const createReceipt = async (data: Parameters<typeof receiptsService.create>[0]) => {
    return await receiptsService.create(data);
  };

  const updateReceipt = async (id: string, updates: Partial<Receipt>) => {
    return await receiptsService.update(id, updates);
  };

  const validateReceipt = async (id: string, user: UserProfile) => {
    return await receiptsService.validate(id, user);
  };

  const cancelReceipt = async (id: string) => {
    return await receiptsService.cancel(id);
  };

  return {
    receipts,
    loading,
    error,
    createReceipt,
    updateReceipt,
    validateReceipt,
    cancelReceipt,
    reload: fetchReceipts
  };
}
