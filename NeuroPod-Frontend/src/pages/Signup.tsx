
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Container } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { GoogleLogin } from "@react-oauth/google";

const Signup = () => {
  const { loginWithGoogle, login, isLoading } = useAuth();

  // Función para manejar el éxito del signup con Google
  const handleGoogleSuccess = async (response: any) => {
    try {
      console.log("Google signup success, credential:", response.credential ? "[CREDENTIAL PRESENT]" : "[NO CREDENTIAL]");
      // Usamos loginWithGoogle ya que el proceso es el mismo
      // El backend detectará si es un usuario nuevo y lo registrará
      await loginWithGoogle(response.credential);
    } catch (error) {
      console.error("Error durante el registro con Google:", error);
      toast({
        title: "Error de registro",
        description: "No se pudo crear la cuenta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Función para manejar errores del signup con Google
  const handleGoogleError = () => {
    console.error("Google signup error");
    toast({
      title: "Error de registro",
      description: "Ocurrió un problema al intentar crear la cuenta con Google.",
      variant: "destructive",
    });
  };

  // Función para el registro simulado (solo para desarrollo)
  const handleMockSignup = async () => {
    try {
      const email = prompt("Ingresa tu email para registro simulado", "usuario@example.com");
      
      if (email) {
        // El login() en este caso crea un usuario si no existe
        await login(email);
      }
    } catch (error) {
      console.error("Error durante el registro simulado:", error);
      toast({
        title: "Error de registro",
        description: "No se pudo crear la cuenta. Inténtalo de nuevo.",
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
          <CardTitle className="text-2xl text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Regístrate con tu cuenta de Google para comenzar a usar NeuroPod
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Botón de registro con Google real */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signup_with"
              shape="rectangular"
              locale="es"
              useOneTap
            />
          </div>
          
          {/* Botón de registro simulado (solo visible en desarrollo) */}
          {import.meta.env.DEV && (
            <div className="mt-4">
              <Button 
                onClick={handleMockSignup} 
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
                {isLoading ? "Creando cuenta..." : "Simulación de registro (Desarrollo)"}
              </Button>
              <p className="text-xs text-center mt-2 text-muted-foreground">
                Esta opción solo está disponible en modo desarrollo
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="text-primary hover:text-primary/90">
              Iniciar Sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
