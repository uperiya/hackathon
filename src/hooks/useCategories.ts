import { useState, useEffect, useCallback } from 'react';
import { Category } from '../types';
import { categoriesService } from '../services/categoriesService';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    const unsubscribe = categoriesService.subscribe((updated) => {
      setCategories(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchCategories]);

  const createCategory = async (data: { name: string; description: string; active?: boolean }) => {
    return await categoriesService.create(data);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    return await categoriesService.update(id, updates);
  };

  const deleteCategory = async (id: string) => {
    return await categoriesService.delete(id);
  };

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reload: fetchCategories
  };
}
