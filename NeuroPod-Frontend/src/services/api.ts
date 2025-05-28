import axios from 'axios';

// Crear instancia de Axios con configuración base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 segundos de timeout para detectar cuando el backend no responde
});

// Interceptor para añadir token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores comunes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si no hay respuesta, significa que el servidor está caído o no hay conexión
    if (!error.response) {
      console.error('Error de conexión:', error.message);
      // No redireccionar automáticamente, dejar que el componente maneje el error
      
      // Agregar propiedad para identificar el tipo de error
      error.isConnectionError = true;
      return Promise.reject(error);
    }
    
    // Error de autenticación
    if (error.response?.status === 401) {
      // Verificar si estamos en una ruta pública
      const currentPath = window.location.pathname;
      const publicRoutes = ['/', '/login', '/signup', '/pricing'];
      
      // Solo limpiar el localStorage y redireccionar si NO estamos en una ruta pública
      if (!publicRoutes.includes(currentPath)) {
        // Token expirado o inválido
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
