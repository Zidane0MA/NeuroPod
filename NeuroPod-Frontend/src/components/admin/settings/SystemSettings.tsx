
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Save, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";
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

export const SystemSettings = () => {
  const [isFixingBalances, setIsFixingBalances] = useState(false);

  const handleFixAdminBalances = async () => {
    try {
      setIsFixingBalances(true);
      
      const response = await api.post('/api/auth/admin/fix-balances');
      
      if (response.data.success) {
        const { usersUpdated } = response.data.data;
        
        toast({
          title: "Balances reparados",
          description: `Se repararon ${usersUpdated} balances de administradores correctamente`,
          variant: "default"
        });
        
        // Sugerir al usuario que recargue la página
        setTimeout(() => {
          toast({
            title: "Recarga recomendada",
            description: "Recarga la página para ver los cambios aplicados",
            variant: "default"
          });
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error reparando balances:', error);
      
      const errorMessage = error.response?.data?.message || 'Error al reparar balances de administradores';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsFixingBalances(false);
    }
  };
  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle>Configuración del Sistema</CardTitle>
        <CardDescription>Gestiona la configuración general del sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-shutdown">Auto-apagado de pods inactivos</Label>
                <p className="text-sm text-muted-foreground">Apaga automáticamente los pods inactivos</p>
              </div>
              <Switch id="auto-shutdown" defaultChecked />
            </div>
            
            <div className="pt-2">
              <Label>Tiempo de inactividad (minutos)</Label>
              <div className="flex justify-between mt-1 mb-1">
                <span className="text-sm">30 min</span>
                <span className="text-sm">240 min</span>
              </div>
              <Slider defaultValue={[120]} min={30} max={240} step={30} />
              <div className="text-center mt-1">
                <span className="text-sm font-medium">120 minutos</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificaciones</Label>
                <p className="text-sm text-muted-foreground">Envía notificaciones por email</p>
              </div>
              <Switch id="notifications" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance">Modo mantenimiento</Label>
                <p className="text-sm text-muted-foreground">Activa el modo de mantenimiento</p>
              </div>
              <Switch id="maintenance" />
            </div>
          </div>
        </div>
        
        {/* Sección de Mantenimiento */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Mantenimiento del Sistema
          </h3>
          
          <div className="space-y-4">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">Reparar Balances de Administradores</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Repara usuarios administradores que tengan balance nulo o incorrecto. Esta operación establece el balance de todos los administradores a infinito.
                    </p>
                    <div className="mt-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                            <Wrench className="h-4 w-4 mr-2" />
                            Reparar Balances
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reparar Balances de Administradores</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta operación buscará todos los usuarios con rol "admin" que tengan balance nulo o incorrecto y los actualizará a balance infinito.
                              <br /><br />
                              Es una operación segura que no afecta a usuarios cliente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleFixAdminBalances}
                              disabled={isFixingBalances}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              {isFixingBalances ? 'Reparando...' : 'Reparar Balances'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <Button className="flex gap-2 items-center bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4" />
            Guardar Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
