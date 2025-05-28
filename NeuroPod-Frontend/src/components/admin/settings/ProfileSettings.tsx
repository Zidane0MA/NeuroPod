
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const ProfileSettings = () => {
  const { user } = useAuth();
  
  return (
    <Card className="overflow-hidden max-w-5xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl">Perfil de Administrador</CardTitle>
        <CardDescription>Gestiona tu información de perfil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={user?.name || ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled />
          </div>
        </div>
        
        <div className="border-t pt-3">
          <Button className="flex gap-1.5 items-center bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
        
        <div className="border-t pt-3">
          <h3 className="font-semibold mb-2">Acciones del Perfil</h3>
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              Eliminar todos los pods
            </Button>
            <Button variant="destructive">
              Eliminar cuenta
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
