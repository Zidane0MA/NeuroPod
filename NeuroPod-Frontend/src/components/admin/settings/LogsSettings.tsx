
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Download } from "lucide-react";

export const LogsSettings = () => {
  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle>Logs y Backups</CardTitle>
        <CardDescription>Gestiona los logs y backups del sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h3 className="font-medium">Logs del Sistema</h3>
          <Textarea 
            className="font-mono h-[160px] resize-none bg-black text-white"
            readOnly
            value={`[2023-05-09 10:15:32] INFO: Sistema iniciado correctamente
[2023-05-09 10:15:35] INFO: Conectados a la base de datos
[2023-05-09 10:17:42] INFO: Usuario usuario1@example.com ha iniciado sesión
[2023-05-09 10:23:15] INFO: Pod ComfyUI-1 iniciado
[2023-05-09 10:45:22] WARNING: Uso de CPU al 80%
[2023-05-09 11:02:18] INFO: Usuario usuario2@example.com ha iniciado sesión
[2023-05-09 11:15:32] ERROR: Error al conectar con la GPU en el Pod-15`}
          />
          <Button variant="outline" className="flex gap-2 items-center">
            <Download className="h-4 w-4" />
            Descargar Logs
          </Button>
        </div>
        
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-medium">Backups</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Último backup: 09/05/2023 04:00</span>
              <Button variant="outline" className="flex gap-2 items-center">
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Backup manual</span>
              <Button>Crear Backup</Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <Label htmlFor="auto-backup">Backups automáticos</Label>
              <p className="text-sm text-muted-foreground">Realiza backups automáticos diarios</p>
            </div>
            <Switch id="auto-backup" defaultChecked />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
