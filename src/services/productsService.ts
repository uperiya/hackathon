import { Product } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  deleteDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const productsService = {
  async getAll(): Promise<Product[]> {
    return await getCollectionData<Product>('products');
  },

  async getById(id: string): Promise<Product | null> {
    return await getDocumentData<Product>('products', id);
  },

  async getBySku(sku: string): Promise<Product | null> {
    const products = await this.getAll();
    return products.find(p => p.sku.toLowerCase() === sku.trim().toLowerCase()) || null;
  },

  async getLowStock(): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter(p => p.active && p.totalStock <= p.reorderLevel);
  },

  async getOutOfStock(): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter(p => p.active && p.totalStock <= 0);
  },

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const existing = await this.getBySku(data.sku);
    if (existing) {
      throw new Error(`Product with SKU '${data.sku}' already exists.`);
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      ...data,
      id: generateId('PROD'),
      totalStock: data.totalStock ?? 0,
      availableStock: data.availableStock ?? (data.totalStock ?? 0),
      reservedStock: data.reservedStock ?? 0,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    await setDocumentData('products', newProduct.id, newProduct);
    return newProduct;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const product = await this.getById(id);
    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    if (updates.sku && updates.sku.toLowerCase() !== product.sku.toLowerCase()) {
      const existing = await this.getBySku(updates.sku);
      if (existing && existing.id !== id) {
        throw new Error(`SKU '${updates.sku}' is already in use by another product.`);
      }
    }

    const updatedProduct: Product = {
      ...product,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDocumentData('products', id, updatedProduct);
    return updatedProduct;
  },

  async delete(id: string): Promise<void> {
    const product = await this.getById(id);
    if (!product) return;

    if (product.totalStock > 0) {
      throw new Error(`Cannot delete product '${product.name}' with active stock (${product.totalStock} units). Please adjust stock to 0 or archive the product instead.`);
    }

    await deleteDocumentData('products', id);
  },

  async batchCreate(items: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product[]> {
    const results: Product[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const existing = await this.getBySku(item.sku);
      if (!existing) {
        const newProduct: Product = {
          ...item,
          id: generateId('PROD'),
          totalStock: item.totalStock ?? 0,
          availableStock: item.availableStock ?? (item.totalStock ?? 0),
          reservedStock: item.reservedStock ?? 0,
          active: true,
          createdAt: now,
          updatedAt: now
        };
        await setDocumentData('products', newProduct.id, newProduct);
        results.push(newProduct);
      }
    }
    return results;
  },

  subscribe(callback: (products: Product[]) => void): () => void {
    return subscribeToCollection<Product>('products', callback);
  }
};
