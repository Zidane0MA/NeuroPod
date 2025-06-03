import api from './api';
import { User } from '@/types/user';

export const userService = {
  /**
   * Obtener todos los usuarios (solo administradores)
   */
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get<{ success: boolean; data: User[] }>('/api/auth/users');
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching users:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, usar datos simulados
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Usando usuarios simulados (el backend no está disponible)');
        
        // Importar datos simulados
        const { mockUsers } = await import('@/data/mockUsers');
        return mockUsers;
      }
      
      throw error;
    }
  },

  /**
   * Actualizar saldo de un usuario (solo administradores)
   */
  updateUserBalance: async (userId: string, balance: number): Promise<void> => {
    try {
      await api.post('/api/auth/users/balance', { userId, balance });
    } catch (error: any) {
      console.error('Error updating user balance:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, simular éxito
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando actualización de saldo (el backend no está disponible)');
        return; // Simular éxito
      }
      
      throw error;
    }
  },

  /**
   * Suspender usuario (detener todos sus pods)
   */
  suspendUser: async (userId: string): Promise<void> => {
    try {
      await api.post('/api/auth/users/suspend', { userId });
    } catch (error: any) {
      console.error('Error suspending user:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, simular éxito
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando suspensión de usuario (el backend no está disponible)');
        return; // Simular éxito
      }
      
      throw error;
    }
  },

  /**
   * Eliminar usuario y todos sus recursos
   */
  deleteUser: async (userId: string): Promise<void> => {
    try {
      await api.delete(`/api/auth/users/${userId}`);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, simular éxito
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Simulando eliminación de usuario (el backend no está disponible)');
        return; // Simular éxito
      }
      
      throw error;
    }
  },

  /**
   * Buscar usuarios por email o nombre (opcional - para filtros avanzados)
   */
  searchUsers: async (searchTerm: string): Promise<User[]> => {
    try {
      const response = await api.get<{ success: boolean; data: User[] }>(`/api/auth/users?search=${encodeURIComponent(searchTerm)}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error searching users:', error);
      
      // Si estamos en desarrollo y el backend no está disponible, usar datos simulados filtrados
      if (import.meta.env.DEV && 
         (error.isConnectionError || !error.response || error.code === 'ECONNABORTED')) {
        console.warn('Usando búsqueda simulada (el backend no está disponible)');
        
        const { mockUsers } = await import('@/data/mockUsers');
        return mockUsers.filter(user => 
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      throw error;
    }
  }
};
