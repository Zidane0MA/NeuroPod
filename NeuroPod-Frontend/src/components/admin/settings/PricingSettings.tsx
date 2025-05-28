
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export const PricingSettings = () => {
  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle>Precios y Cuotas</CardTitle>
        <CardDescription>Configura los precios y límites del sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-medium">Precios GPU</h3>
            
            <div className="space-y-2">
              <Label htmlFor="rtx-4050-price">NVIDIA RTX 4050</Label>
              <div className="flex items-center">
                <Input id="rtx-4050-price" type="number" defaultValue="2.50" className="max-w-[100px]" />
                <span className="ml-2">€/hora</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rtx-4080-price">NVIDIA RTX 4080</Label>
              <div className="flex items-center">
                <Input id="rtx-4080-price" type="number" defaultValue="4.99" className="max-w-[100px]" />
                <span className="ml-2">€/hora</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rtx-4090-price">NVIDIA RTX 4090</Label>
              <div className="flex items-center">
                <Input id="rtx-4090-price" type="number" defaultValue="8.99" className="max-w-[100px]" />
                <span className="ml-2">€/hora</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Precios Almacenamiento</h3>
            
            <div className="space-y-2">
              <Label htmlFor="container-disk-price">Container Disk</Label>
              <div className="flex items-center">
                <Input id="container-disk-price" type="number" defaultValue="0.05" className="max-w-[100px]" />
                <span className="ml-2">€/GB/hora</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="volume-disk-price">Volume Disk</Label>
              <div className="flex items-center">
                <Input id="volume-disk-price" type="number" defaultValue="0.10" className="max-w-[100px]" />
                <span className="ml-2">€/GB/hora</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="free-tier">Free Tier</Label>
                <p className="text-sm text-muted-foreground">Habilita el nivel gratuito</p>
              </div>
              <Switch id="free-tier" defaultChecked />
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <Button className="flex gap-2 items-center bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4" />
            Guardar Precios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
