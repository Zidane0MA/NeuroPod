import api from './api';
import { User } from '@/types/user';

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<{ data: User[] }>('/api/auth/users');
    return response.data.data;
  },
  updateUserBalance: async (userId: string, balance: number) => {
    return api.post('/api/auth/users/balance', { userId, balance });
  },
  // Agrega aquí métodos para suspender/eliminar si los implementas
};