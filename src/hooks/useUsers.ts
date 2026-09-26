import { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { usersService } from '../services/usersService';

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersService.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const unsubscribe = usersService.subscribe((updated) => {
      setUsers(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUsers]);

  const createUser = async (data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    avatarUrl?: string;
  }) => {
    return await usersService.create(data);
  };

  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    return await usersService.update(id, updates);
  };

  const toggleActive = async (id: string, active: boolean) => {
    return await usersService.toggleActive(id, active);
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    toggleActive,
    reload: fetchUsers
  };
}
