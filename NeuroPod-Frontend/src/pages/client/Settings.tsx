
import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, User, Trash } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ClientSettings = () => {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout title="Configuración">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Configuración</h1>
        <p className="text-muted-foreground">Gestiona tu cuenta y preferencias</p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil de Usuario
            </CardTitle>
            <CardDescription>Actualiza tu información personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={user?.name || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" className="flex gap-2 items-center bg-purple-600 hover:bg-purple-700">
                <Save className="h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive">Acciones de Cuenta</CardTitle>
            <CardDescription>
              Acciones irreversibles que afectan a tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-medium">Eliminar todos los pods</h3>
                <p className="text-xs text-muted-foreground">
                  Elimina todos tus pods y libera los recursos
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    Eliminar Pods
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente todos
                      tus pods y liberará todos los recursos asociados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Eliminar todos los pods
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="font-medium">Eliminar cuenta</h3>
                <p className="text-xs text-muted-foreground">
                  Elimina permanentemente tu cuenta y todos tus datos
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex gap-2 items-center">
                    <Trash className="h-4 w-4" />
                    Eliminar Cuenta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta
                      y todos los datos asociados a ella.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={logout}
                    >
                      Eliminar mi cuenta permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientSettings;
