import { Category, Product } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  deleteDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const categoriesService = {
  async getAll(): Promise<Category[]> {
    const [categories, products] = await Promise.all([
      getCollectionData<Category>('categories'),
      getCollectionData<Product>('products')
    ]);

    // Compute live productCount dynamically
    return categories.map(cat => ({
      ...cat,
      productCount: products.filter(p => p.categoryId === cat.id).length
    }));
  },

  async getById(id: string): Promise<Category | null> {
    const category = await getDocumentData<Category>('categories', id);
    if (!category) return null;

    const products = await getCollectionData<Product>('products');
    return {
      ...category,
      productCount: products.filter(p => p.categoryId === id).length
    };
  },

  async create(data: { name: string; description: string; active?: boolean }): Promise<Category> {
    const categories = await getCollectionData<Category>('categories');
    const existing = categories.find(c => c.name.toLowerCase() === data.name.trim().toLowerCase());
    if (existing) {
      throw new Error(`Category '${data.name}' already exists.`);
    }

    const now = new Date().toISOString();
    const newCategory: Category = {
      id: generateId('CAT'),
      name: data.name.trim(),
      description: data.description.trim(),
      active: data.active ?? true,
      productCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await setDocumentData('categories', newCategory.id, newCategory);
    return newCategory;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const category = await getDocumentData<Category>('categories', id);
    if (!category) {
      throw new Error(`Category not found: ${id}`);
    }

    if (updates.name && updates.name.toLowerCase() !== category.name.toLowerCase()) {
      const all = await getCollectionData<Category>('categories');
      const conflict = all.find(c => c.id !== id && c.name.toLowerCase() === updates.name!.trim().toLowerCase());
      if (conflict) {
        throw new Error(`Another category named '${updates.name}' already exists.`);
      }
    }

    const updatedCategory: Category = {
      ...category,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDocumentData('categories', id, updatedCategory);
    return updatedCategory;
  },

  async delete(id: string): Promise<void> {
    const products = await getCollectionData<Product>('products');
    const assignedProducts = products.filter(p => p.categoryId === id);

    if (assignedProducts.length > 0) {
      throw new Error(
        `Cannot delete category: ${assignedProducts.length} product(s) are currently assigned to it. Please reassign those products first or deactivate the category.`
      );
    }

    await deleteDocumentData('categories', id);
  },

  subscribe(callback: (categories: Category[]) => void): () => void {
    return subscribeToCollection<Category>('categories', async (cats) => {
      const products = await getCollectionData<Product>('products');
      const enriched = cats.map(cat => ({
        ...cat,
        productCount: products.filter(p => p.categoryId === cat.id).length
      }));
      callback(enriched);
    });
  }
};
