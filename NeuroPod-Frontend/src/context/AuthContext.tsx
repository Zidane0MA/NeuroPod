import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/types/user";
import { authService } from "@/services/auth.service";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (email: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isOfflineMode: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const navigate = useNavigate();

  // Verificar token en localStorage al cargar
  useEffect(() => {
    const checkAuth = async () => {
      // Obtener la ruta actual
      const currentPath = window.location.pathname;
      
      // Lista de rutas públicas que no requieren verificación
      const publicRoutes = ['/', '/login', '/signup', '/pricing'];
      
      // Si estamos en una ruta pública, no verificamos la autenticación
      if (publicRoutes.includes(currentPath)) {
        setIsLoading(false);
        return;
      }
      
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Verificar si el token es válido
          const user = await authService.verifyToken();
          setUser(user);
          setIsOfflineMode(false);
        } catch (error: any) {
          console.error('Error al verificar token:', error);
          
          // Si el error menciona que el backend no está disponible y estamos en desarrollo,
          // usar el usuario almacenado en localStorage automáticamente
          if (import.meta.env.DEV && error.message?.includes("Backend no disponible")) {
            console.warn("Backend no disponible durante la verificación de token, usando datos locales");
            
            // Recuperar usuario del localStorage
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              setUser(JSON.parse(storedUser));
              setIsOfflineMode(true);
              toast({
                title: "Modo sin conexión activado",
                description: "Estás trabajando sin conexión al servidor.",
                variant: "warning"
              });
              setIsLoading(false);
              return;
            }
          }
          
          // Si no podemos usar el modo sin conexión, limpiar datos locales
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Iniciar sesión con Google
  const loginWithGoogle = async (googleToken: string) => {
    try {
      setIsLoading(true);
      const { token, user } = await authService.loginWithGoogle(googleToken);
      setUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setIsOfflineMode(false);
      navigate("/dashboard");
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido ${user.name || user.email}`,
      });
    } catch (error: unknown) {
      let description = "No se pudo iniciar sesión";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response?.data?.message === "string"
      ) {
        description = (error as any).response.data.message;
      } else if (error instanceof Error && error.message) {
        description = error.message;
      }
      toast({
        title: "Error de autenticación",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Para desarrollo: login con email (será reemplazado por Google OAuth)
  const login = async (email: string) => {
    try {
      setIsLoading(true);
      console.log('Intentando login con email:', email);
      
      // Intentar login con el mockLogin service
      const { token, user } = await authService.mockLogin(email);
      
      // Si llegamos aquí, el login fue exitoso, guardamos los datos
      console.log('Login exitoso, guardando datos del usuario');
      setUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setIsOfflineMode(false);
      
      // Mostrar mensaje de éxito según el rol
      if (user.role === 'admin') {
        toast({
          title: "Bienvenido, Administrador",
          description: `Iniciaste sesión como ${user.name || user.email}`,
        });
      } else {
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido ${user.name || user.email}`,
        });
      }
      
      // Redirigir al dashboard después del login
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error durante login:", error);
      
      // Si estamos en modo desarrollo y hay un error que menciona problemas con el backend
      if (import.meta.env.DEV && 
          (error.message?.includes("Backend no disponible") || 
           error.message?.includes("Endpoint mock-login no encontrado") ||
           error.code === 'ECONNABORTED')) {
        console.warn("Backend no disponible, entrando en modo sin conexión automáticamente");
        setIsOfflineMode(true);
        mockLoginFallback(email);
        return;
      }
      
      // Mostrar mensaje de error para otros tipos de error
      const errorMessage = error.response?.data?.message || error.message || "No se pudo iniciar sesión";
      toast({
        title: "Error de autenticación",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback en caso de que el backend no esté disponible (solo en desarrollo)
  const mockLoginFallback = (email: string) => {
    const newUser: User = 
      email === "lolerodiez@gmail.com" 
        ? { 
            id: "admin-1",
            email, 
            name: "Admin", 
            registrationDate: new Date().toLocaleDateString(),
            activePods: 2,
            totalPods: 5,
            balance: Infinity,
            status: 'online',
            role: "admin" 
          } 
        : { 
            id: "client-1",
            email, 
            name: "Cliente", 
            registrationDate: new Date().toLocaleDateString(),
            activePods: 1,
            totalPods: 3,
            balance: 10,
            status: 'online',
            role: "client" 
          };
    
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", "mock-token");
    setIsOfflineMode(true);
    
    // Redirigir al dashboard
    navigate("/dashboard");
    
    toast({
      title: "Modo sin conexión",
      description: `Sesión simulada para ${email}`,
      variant: "warning"
    });
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Intentar logout en el servidor solo si no estamos en modo sin conexión
      if (!isOfflineMode) {
        try {
          await authService.logout();
          console.log('Logout exitoso en el servidor');
        } catch (error) {
          console.warn('Error al cerrar sesión en el servidor, continuando con logout local:', error);
          // Continuamos con el logout local aunque falle en el servidor
        }
      }
      
      // Limpiar datos locales y mostrar mensaje
      setUser(null);
      setIsOfflineMode(false);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      
      // Redireccionar a login
      navigate("/login");
    } catch (error) {
      console.error('Error durante logout:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al cerrar sesión",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      isOfflineMode,
      login, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
