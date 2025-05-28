
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Mostrar indicador de carga mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <span className="ml-2 text-lg">Verificando acceso...</span>
      </div>
    );
  }

  // Redirigir a login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol si se requiere uno específico
  if (requiredRole && user?.role !== requiredRole) {
    // Dashboard es accesible para todos los usuarios autenticados
    if (window.location.pathname === "/dashboard") {
      return <>{children}</>;
    }
    
    // Admin que intenta acceder a rutas de cliente
    if (requiredRole === "client" && user?.role === "admin") {
      return <Navigate to="/admin/pods" replace />;
    }
    
    // Cliente que intenta acceder a rutas de admin
    if (requiredRole === "admin" && user?.role === "client") {
      return <Navigate to="/client/pods" replace />;
    }
    
    // Cualquier otro caso
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
