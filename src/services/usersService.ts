import { UserProfile, UserRole } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const usersService = {
  async getAll(): Promise<UserProfile[]> {
    return await getCollectionData<UserProfile>('users');
  },

  async getById(id: string): Promise<UserProfile | null> {
    return await getDocumentData<UserProfile>('users', id);
  },

  async getByEmail(email: string): Promise<UserProfile | null> {
    const users = await this.getAll();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async create(data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    avatarUrl?: string;
  }): Promise<UserProfile> {
    const existing = await this.getByEmail(data.email);
    if (existing) {
      throw new Error(`User with email '${data.email}' already exists.`);
    }

    const now = new Date().toISOString();
    const newUser: UserProfile = {
      id: generateId('USR'),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      phone: data.phone?.trim() || '',
      avatarUrl: data.avatarUrl || '',
      active: true,
      createdAt: now,
      updatedAt: now
    };

    await setDocumentData('users', newUser.id, newUser);
    return newUser;
  },

  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = await this.getById(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }

    const updatedUser: UserProfile = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDocumentData('users', id, updatedUser);
    return updatedUser;
  },

  async toggleActive(id: string, active: boolean): Promise<void> {
    await updateDocumentData('users', id, {
      active,
      updatedAt: new Date().toISOString()
    });
  },

  subscribe(callback: (users: UserProfile[]) => void): () => void {
    return subscribeToCollection<UserProfile>('users', callback);
  }
};
