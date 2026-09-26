import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { productsService } from '../services/productsService';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productsService.getAll();
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const unsubscribe = productsService.subscribe((updated) => {
      setProducts(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchProducts]);

  const createProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await productsService.create(data);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    return await productsService.update(id, updates);
  };

  const deleteProduct = async (id: string) => {
    return await productsService.delete(id);
  };

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    reload: fetchProducts
  };
}
