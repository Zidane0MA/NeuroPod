import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { pricingService, PricingData, UpdatePricingParams } from "@/services/pricing.service";

export const PricingSettings = () => {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [formData, setFormData] = useState<UpdatePricingParams>({});

  // Cargar configuración actual
  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const data = await pricingService.getPricing();
      setPricing(data);
      
      // Inicializar form data con valores actuales
      setFormData({
        gpus: {
          "rtx-4050": { price: data.gpus["rtx-4050"]?.price },
          "rtx-4080": { price: data.gpus["rtx-4080"]?.price },
          "rtx-4090": { price: data.gpus["rtx-4090"]?.price }
        },
        storage: {
          containerDisk: { 
            price: data.storage.containerDisk.price, 
            unit: data.storage.containerDisk.unit, 
            description: data.storage.containerDisk.description 
          },
          volumeDisk: { 
            price: data.storage.volumeDisk.price, 
            unit: data.storage.volumeDisk.unit, 
            description: data.storage.volumeDisk.description 
          }
        },
        freeTier: {
          enabled: data.freeTier.enabled
        }
      });
    } catch (error) {
      console.error('Error loading pricing:', error);
      toast.error('Error al cargar configuración de precios');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validar que los precios no sean negativos
      const updates: UpdatePricingParams = {};
      
      if (formData.gpus) {
        updates.gpus = {};
        Object.keys(formData.gpus).forEach(gpuId => {
          const price = formData.gpus![gpuId]?.price;
          if (price !== undefined && price >= 0) {
            updates.gpus![gpuId] = { price };
          }
        });
      }
      
      if (formData.storage) {
        updates.storage = {};
        if (formData.storage.containerDisk?.price !== undefined && formData.storage.containerDisk.price >= 0) {
          updates.storage.containerDisk = {
            price: formData.storage.containerDisk.price,
            unit: pricing?.storage.containerDisk.unit || "",
            description: pricing?.storage.containerDisk.description || ""
          };
        }
        if (formData.storage.volumeDisk?.price !== undefined && formData.storage.volumeDisk.price >= 0) {
          updates.storage.volumeDisk = {
            price: formData.storage.volumeDisk.price,
            unit: pricing?.storage.volumeDisk.unit || "",
            description: pricing?.storage.volumeDisk.description || ""
          };
        }
      }
      
      if (formData.freeTier) {
        updates.freeTier = formData.freeTier;
      }
      
      await pricingService.updatePricing(updates);
      await loadPricing(); // Recargar datos actualizados
      
      toast.success('Precios actualizados correctamente');
    } catch (error: any) {
      console.error('Error updating pricing:', error);
      const message = error.response?.data?.message || 'Error al actualizar precios';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      await pricingService.resetPricing();
      await loadPricing();
      toast.success('Precios restablecidos a valores por defecto');
    } catch (error) {
      console.error('Error resetting pricing:', error);
      toast.error('Error al restablecer precios');
    } finally {
      setResetting(false);
    }
  };

  const updateGpuPrice = (gpuId: string, price: number) => {
    setFormData(prev => ({
      ...prev,
      gpus: {
        ...prev.gpus,
        [gpuId]: { price }
      }
    }));
  };

  const updateStoragePrice = (type: 'containerDisk' | 'volumeDisk', price: number) => {
    setFormData(prev => ({
      ...prev,
      storage: {
        ...prev.storage,
        [type]: { price }
      }
    }));
  };

  const updateFreeTier = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      freeTier: {
        ...prev.freeTier,
        enabled
      }
    }));
  };

  if (loading) {
    return (
      <Card className="max-w-5xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!pricing) {
    return (
      <Card className="max-w-5xl mx-auto">
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar la configuración de precios. Por favor, intenta recargar la página.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle>Precios y Cuotas</CardTitle>
        <CardDescription>
          Configura los precios y límites del sistema. Los cambios se aplicarán inmediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-medium">Precios GPU</h3>
            
            <div className="space-y-2">
              <Label htmlFor="rtx-4050-price">NVIDIA RTX 4050</Label>
              <div className="flex items-center">
                <Input 
                  id="rtx-4050-price" 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={formData.gpus?.["rtx-4050"]?.price || 0}
                  onChange={(e) => updateGpuPrice("rtx-4050", parseFloat(e.target.value) || 0)}
                  className="max-w-[100px]" 
                />
                <span className="ml-2">€/hora</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rtx-4080-price">NVIDIA RTX 4080</Label>
              <div className="flex items-center">
                <Input 
                  id="rtx-4080-price" 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={formData.gpus?.["rtx-4080"]?.price || 0}
                  onChange={(e) => updateGpuPrice("rtx-4080", parseFloat(e.target.value) || 0)}
                  className="max-w-[100px]" 
                />
                <span className="ml-2">€/hora</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rtx-4090-price">NVIDIA RTX 4090</Label>
              <div className="flex items-center">
                <Input 
                  id="rtx-4090-price" 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={formData.gpus?.["rtx-4090"]?.price || 0}
                  onChange={(e) => updateGpuPrice("rtx-4090", parseFloat(e.target.value) || 0)}
                  className="max-w-[100px]" 
                />
                <span className="ml-2">€/hora</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Precios Almacenamiento</h3>
            
            <div className="space-y-2">
              <Label htmlFor="container-disk-price">Container Disk</Label>
              <div className="flex items-center">
                <Input 
                  id="container-disk-price" 
                  type="number" 
                  step="0.001"
                  min="0"
                  value={formData.storage?.containerDisk?.price || 0}
                  onChange={(e) => updateStoragePrice("containerDisk", parseFloat(e.target.value) || 0)}
                  className="max-w-[100px]" 
                />
                <span className="ml-2">€/GB/hora</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="volume-disk-price">Volume Disk</Label>
              <div className="flex items-center">
                <Input 
                  id="volume-disk-price" 
                  type="number" 
                  step="0.001"
                  min="0"
                  value={formData.storage?.volumeDisk?.price || 0}
                  onChange={(e) => updateStoragePrice("volumeDisk", parseFloat(e.target.value) || 0)}
                  className="max-w-[100px]" 
                />
                <span className="ml-2">€/GB/hora</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="free-tier">Free Tier</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita el nivel gratuito ({pricing.freeTier.initialBalance}€ iniciales)
                </p>
              </div>
              <Switch 
                id="free-tier" 
                checked={formData.freeTier?.enabled ?? false}
                onCheckedChange={updateFreeTier}
              />
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4 flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="flex gap-2 items-center bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar Precios'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleReset}
            disabled={resetting}
            className="flex gap-2 items-center"
          >
            {resetting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {resetting ? 'Restableciendo...' : 'Restablecer por Defecto'}
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Los cambios en los precios se aplican inmediatamente y afectan a todos los nuevos pods que se creen.
            Los pods existentes mantienen su configuración de precios original.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
