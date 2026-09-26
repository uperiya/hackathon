import { useState, useEffect, useCallback } from 'react';
import { Transfer, UserProfile } from '../types';
import { transfersService } from '../services/transfersService';

export function useTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transfersService.getAll();
      setTransfers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    const unsubscribe = transfersService.subscribe((updated) => {
      setTransfers(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchTransfers]);

  const createTransfer = async (data: Parameters<typeof transfersService.create>[0]) => {
    return await transfersService.create(data);
  };

  const updateTransfer = async (id: string, updates: Partial<Transfer>) => {
    return await transfersService.update(id, updates);
  };

  const checkAvailability = async (id: string) => {
    return await transfersService.checkAvailability(id);
  };

  const validateTransfer = async (id: string, user: UserProfile) => {
    return await transfersService.validate(id, user);
  };

  const cancelTransfer = async (id: string) => {
    return await transfersService.cancel(id);
  };

  return {
    transfers,
    loading,
    error,
    createTransfer,
    updateTransfer,
    checkAvailability,
    validateTransfer,
    cancelTransfer,
    reload: fetchTransfers
  };
}
