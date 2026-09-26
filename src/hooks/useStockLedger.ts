import { useState, useEffect, useCallback } from 'react';
import { StockLedgerEntry } from '../types';
import { stockLedgerService } from '../services/stockLedgerService';

export function useStockLedger(productId?: string) {
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = productId
        ? await stockLedgerService.getByProduct(productId)
        : await stockLedgerService.getAll();
      setEntries(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch stock ledger entries');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchEntries();
    const unsubscribe = stockLedgerService.subscribe((updated) => {
      const filtered = productId ? updated.filter(e => e.productId === productId) : updated;
      setEntries(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchEntries, productId]);

  const filterByDateRange = async (startDate: string, endDate: string) => {
    try {
      setLoading(true);
      const data = await stockLedgerService.getByDateRange(startDate, endDate);
      const filtered = productId ? data.filter(e => e.productId === productId) : data;
      setEntries(filtered);
    } catch (err: any) {
      setError(err?.message || 'Failed to filter ledger');
    } finally {
      setLoading(false);
    }
  };

  return {
    entries,
    loading,
    error,
    filterByDateRange,
    reload: fetchEntries
  };
}
