import axios from 'axios';

const getBaseURL = () => {
  // Si estamos en el dominio de producción, usar la variable de entorno correspondiente
  if (window.location.hostname === 'app.neuropod.online') {
    return import.meta.env.VITE_API_URL_HTTPS;
  }

  // Fallback a variable de entorno genérica o localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

// Crear instancia de Axios con configuración base
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 segundos de timeout para detectar cuando el backend no responde
});

// 🔧 NUEVO: Crear instancia especial para operaciones de pods que pueden tardar más
const apiPods = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos para operaciones de pods (crear, eliminar, iniciar)
});

// Función helper para aplicar interceptores a cualquier instancia
const setupInterceptors = (instance) => {
  // Interceptor para añadir token de autenticación
  instance.interceptors.request.use(
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
  instance.interceptors.response.use(
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
};

// Aplicar interceptores a ambas instancias
setupInterceptors(api);
setupInterceptors(apiPods);

// Exportar ambas instancias
export default api;
export { apiPods };
