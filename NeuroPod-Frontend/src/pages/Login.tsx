
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Container } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const { loginWithGoogle, login, isLoading } = useAuth();

  // Función para manejar el éxito del login con Google
  const handleGoogleSuccess = async (response: any) => {
    try {
      console.log("Google login success, credential:", response.credential ? "[CREDENTIAL PRESENT]" : "[NO CREDENTIAL]");
      // response.credential contiene el token ID de Google
      await loginWithGoogle(response.credential);
    } catch (error) {
      console.error("Error durante la autenticación con Google:", error);
      toast({
        title: "Error de inicio de sesión",
        description: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Función para manejar errores del login con Google
  const handleGoogleError = () => {
    console.error("Google login error");
    toast({
      title: "Error de autenticación",
      description: "Ocurrió un problema al intentar iniciar sesión con Google.",
      variant: "destructive",
    });
  };

  // Función para el login simulado (solo para desarrollo)
  const handleMockLogin = async () => {
    try {
      const emailInput = prompt("Ingresa tu email para iniciar sesión simulada (usa lolerodiez@gmail.com para admin)", "lolerodiez@gmail.com");
      
      if (emailInput) {
        await login(emailInput);
      }
    } catch (error) {
      console.error("Error durante el login simulado:", error);
      toast({
        title: "Error de inicio de sesión",
        description: "No se pudo iniciar sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/">
              <Container className="h-10 w-10 text-purple-500 hover:text-purple-700 transition-colors" />
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión con tu cuenta de Google para acceder a NeuroPod
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Botón de login con Google real - siempre visible */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              locale="es"
              useOneTap
            />
          </div>
          
          {/* Botón de login simulado (solo visible en desarrollo) */}
          {import.meta.env.DEV && (
            <div className="mt-4">
              <Button 
                onClick={handleMockLogin} 
                variant="outline" 
                size="lg"
                className="w-full flex gap-2 items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-t-2 border-purple-500 rounded-full mr-2"></div>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M12 4a4 4 0 100 8 4 4 0 000-8zM6 12a6 6 0 1112 0v8H6v-8z" fill="currentColor" />
                  </svg>
                )}
                {isLoading ? "Iniciando sesión..." : "Simulación de login (Desarrollo)"}
              </Button>
              <p className="text-xs text-center mt-2 text-muted-foreground">
                Esta opción solo está disponible en modo desarrollo
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link to="/signup" className="text-primary hover:text-primary/90">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
