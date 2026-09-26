import { useState, useEffect, useCallback } from 'react';
import { ReorderingRule } from '../types';
import { reorderingRulesService } from '../services/reorderingRulesService';

export function useReorderingRules() {
  const [rules, setRules] = useState<ReorderingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reorderingRulesService.getAll();
      setRules(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch reordering rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    const unsubscribe = reorderingRulesService.subscribe((updated) => {
      setRules(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchRules]);

  const createRule = async (data: Parameters<typeof reorderingRulesService.create>[0]) => {
    return await reorderingRulesService.create(data);
  };

  const updateRule = async (id: string, updates: Partial<ReorderingRule>) => {
    return await reorderingRulesService.update(id, updates);
  };

  const deleteRule = async (id: string) => {
    return await reorderingRulesService.delete(id);
  };

  return {
    rules,
    loading,
    error,
    createRule,
    updateRule,
    deleteRule,
    reload: fetchRules
  };
}
