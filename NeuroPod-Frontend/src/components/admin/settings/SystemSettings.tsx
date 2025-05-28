
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export const SystemSettings = () => {
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
