import api from './api';
import { User } from '@/types/user';

interface AuthResponse {
  token: string;
  user: User;
}

interface GoogleAuthParams {
  token: string; // Token de autenticación de Google
}

export const authService = {
  // Iniciar sesión con Google
  loginWithGoogle: async (googleToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/google', { token: googleToken });
    return response.data;
  },

  // Verificar token actual (útil para recuperar sesión)
  verifyToken: async (): Promise<User> => {
    try {
      // Intentar verificar si el backend está disponible
      try {
        // Hacer una petición simple para verificar si el backend está funcionando
        await api.get('/api/status/public');
      } catch (error) {
        // Si el backend no está disponible, lanzar un error
        console.error('Backend no disponible:', error);
        throw new Error('Backend no disponible');
      }
      
      // Si el backend está disponible, verificar el token
      const response = await api.get<{ user: User }>('/api/auth/verify');
      return response.data.user;
    } catch (error: any) {
      console.error('Error al verificar token:', error);
      throw error;
    }
  },

  // Cerrar sesión
  logout: async (): Promise<void> => {
    const token = localStorage.getItem('token');
    if (token) {
      await api.post('/api/auth/logout', { token });
    }
  },

  // Para desarrollo: simular login (será eliminado en producción)
  mockLogin: async (email: string): Promise<AuthResponse> => {
    try {
      // Si el backend está disponible, intentar login con el endpoint correcto
      try {
        // Primero verificamos si el backend está disponible
        await api.get('/api/status/public');
        console.log('Backend disponible, intentando login real');
        
        // Si llega aquí, el backend está disponible, intentar login real
        const response = await api.post<AuthResponse>('/api/auth/mock-login', { email });
        console.log('Login exitoso con el backend real');
        return response.data;
      } catch (error: any) {
        console.error('Error al conectar con el backend:', error);
        
        // Verificar si es un error de timeout o conexión rechazada
        if (!error.response || error.code === 'ECONNABORTED') {
          console.warn('Backend no disponible (timeout o conexión rechazada)');
          throw new Error('Backend no disponible');
        }
        
        // Si el error es 404, significa que el endpoint no existe
        if (error.response?.status === 404) {
          console.warn('Endpoint mock-login no encontrado');
          throw new Error('Endpoint mock-login no encontrado');
        }
        
        // Cualquier otro tipo de error del backend
        throw error;
      }
    } catch (error: any) {
      console.error('Error en mockLogin:', error);
      
      // Solo en modo desarrollo, proporcionar una respuesta simulada
      if (import.meta.env.DEV && 
          (error.message?.includes("Backend no disponible") || 
           error.message?.includes("Endpoint mock-login no encontrado"))) {
            
        console.warn('Simulando respuesta de login (el backend no está disponible)');
        const isAdmin = email === 'lolerodiez@gmail.com';
        
        return {
          token: 'mock-token-for-development',
          user: {
            id: isAdmin ? 'admin-1' : 'client-1',
            email: email,
            name: isAdmin ? 'Admin' : 'Cliente',
            role: isAdmin ? 'admin' : 'client',
            balance: isAdmin ? Infinity : 10,
            registrationDate: new Date().toLocaleDateString(),
            activePods: isAdmin ? 2 : 1,
            totalPods: isAdmin ? 5 : 3,
            status: 'online'
          }
        };
      }
      
      throw error;
    }
  }
};
