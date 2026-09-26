import { ReorderingRule, Product, Warehouse } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  deleteDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const reorderingRulesService = {
  async getAll(): Promise<ReorderingRule[]> {
    return await getCollectionData<ReorderingRule>('reorderingRules');
  },

  async getById(id: string): Promise<ReorderingRule | null> {
    return await getDocumentData<ReorderingRule>('reorderingRules', id);
  },

  async getByProduct(productId: string): Promise<ReorderingRule[]> {
    const rules = await this.getAll();
    return rules.filter(r => r.productId === productId && r.active);
  },

  async create(data: {
    productId: string;
    warehouseId: string;
    minQuantity: number;
    preferredQuantity: number;
  }): Promise<ReorderingRule> {
    const [product, warehouse] = await Promise.all([
      getDocumentData<Product>('products', data.productId),
      getDocumentData<Warehouse>('warehouses', data.warehouseId)
    ]);

    if (!product) throw new Error(`Product not found: ${data.productId}`);
    if (!warehouse) throw new Error(`Warehouse not found: ${data.warehouseId}`);

    const existingRules = await this.getAll();
    const duplicate = existingRules.find(
      r => r.productId === data.productId && r.warehouseId === data.warehouseId
    );
    if (duplicate) {
      throw new Error(`A reordering rule for '${product.name}' in warehouse '${warehouse.name}' already exists.`);
    }

    const now = new Date().toISOString();
    const newRule: ReorderingRule = {
      id: generateId('RULE'),
      productId: data.productId,
      productName: product.name,
      sku: product.sku,
      warehouseId: data.warehouseId,
      warehouseName: warehouse.name,
      minQuantity: Number(data.minQuantity),
      preferredQuantity: Number(data.preferredQuantity),
      unitOfMeasure: product.unitOfMeasure,
      active: true,
      createdAt: now,
      updatedAt: now
    };

    await setDocumentData('reorderingRules', newRule.id, newRule);
    return newRule;
  },

  async update(id: string, updates: Partial<ReorderingRule>): Promise<ReorderingRule> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Reordering rule not found: ${id}`);

    const updated: ReorderingRule = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDocumentData('reorderingRules', id, updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await deleteDocumentData('reorderingRules', id);
  },

  subscribe(callback: (rules: ReorderingRule[]) => void): () => void {
    return subscribeToCollection<ReorderingRule>('reorderingRules', callback);
  }
};
