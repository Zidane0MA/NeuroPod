import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Cpu, Server, HardDrive, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { pricingService, PricingData } from "@/services/pricing.service";

interface GpuCard {
  id: string;
  name: string;
  description: string;
  price: string;
  priceUnit: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  popular: boolean;
}

export const PricingCards = () => {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pricingService.getPricing();
      setPricing(data);
    } catch (err) {
      console.error('Error loading pricing:', err);
      setError('No se pudieron cargar los precios. Mostrando valores por defecto.');
      // Fallback a valores por defecto
      setPricing(getDefaultPricing());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPricing = (): PricingData => ({
    gpus: {
      "rtx-4050": {
        id: "rtx-4050",
        name: "RTX 4050",
        price: 2.50,
        available: true,
        specs: {
          memory: "6GB GDDR6",
          cores: 2560,
          performance: "Entry Level"
        }
      },
      "rtx-4080": {
        id: "rtx-4080",
        name: "RTX 4080",
        price: 4.99,
        available: false,
        specs: {
          memory: "16GB GDDR6X",
          cores: 9728,
          performance: "Ultra Performance"
        }
      },
      "rtx-4090": {
        id: "rtx-4090",
        name: "RTX 4090",
        price: 8.99,
        available: false,
        specs: {
          memory: "24GB GDDR6X",
          cores: 16384,
          performance: "Flagship"
        }
      }
    },
    storage: {
      containerDisk: { price: 0.05, unit: "€/GB/hora", description: "Container storage" },
      volumeDisk: { price: 0.10, unit: "€/GB/hora", description: "Persistent volume" }
    },
    limits: { containerDiskMax: 100, volumeDiskMax: 150, portsMax: 10 },
    freeTier: { enabled: true, initialBalance: 10.00 }
  });

  const convertToGpuCards = (pricingData: PricingData): GpuCard[] => {
    const gpuIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      "rtx-4050": Cpu,
      "rtx-4080": Server,
      "rtx-4090": HardDrive
    };

    const descriptions: Record<string, string> = {
      "rtx-4050": "Ideal para cargas de trabajo medianas y contenedores de desarrollo",
      "rtx-4080": "Para contenedores de alto rendimiento y procesamiento masivo",
      "rtx-4090": "Máximo rendimiento para aplicaciones exigentes"
    };

    return Object.keys(pricingData.gpus).map(gpuId => {
      const gpu = pricingData.gpus[gpuId];
      return {
        id: gpuId,
        name: gpu.name,
        description: descriptions[gpuId] || `GPU ${gpu.name} para computación`,
        price: pricingService.formatPrice(gpu.price),
        priceUnit: "por hora",
        features: [
          `CUDA Cores: ${gpu.specs.cores.toLocaleString()}`,
          gpu.specs.memory,
          `Hasta ${gpuId === 'rtx-4050' ? '4' : gpuId === 'rtx-4080' ? '8' : 'ilimitados'} contenedores simultáneos`,
          "Soporte para CUDA y cuDNN",
          gpuId === 'rtx-4090' ? "Almacenamiento SSD NVMe Premium" : "SSD de alta velocidad incluido"
        ],
        icon: gpuIconMap[gpuId] || Cpu,
        available: gpu.available,
        popular: gpuId === 'rtx-4050' // RTX 4050 es popular
      };
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <Card key={i} className="flex flex-col h-full border-2 animate-pulse">
            <CardContent className="flex-grow p-6">
              <div className="h-8 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-3 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!pricing) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se pudieron cargar los precios. Por favor, intenta recargar la página.
        </AlertDescription>
      </Alert>
    );
  }

  const gpuOptions = convertToGpuCards(pricing);

  return (
    <div className="space-y-4">
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {gpuOptions.map((option) => (
          <Card key={option.id} className="flex flex-col h-full border-2 hover:border-purple-400 transition-all">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <option.icon className="h-8 w-8 text-purple-500" />
                {option.popular && (
                  <Badge variant="default" className="bg-purple-500">Popular</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{option.name}</CardTitle>
              <CardDescription className="text-base">{option.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-6">
                <span className="text-3xl font-bold">{option.price}</span>
                <span className="text-muted-foreground ml-1">{option.priceUnit}</span>
              </div>
              <ul className="space-y-3">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                asChild 
                className="w-full" 
                variant={option.available ? "default" : "outline"}
                disabled={!option.available}
              >
                {option.available ? (
                  <Link to="/signup">Seleccionar Plan</Link>
                ) : (
                  <span>Próximamente</span>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">Información Adicional</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <p><strong>Container Storage:</strong> {pricingService.formatPrice(pricing.storage.containerDisk.price)}/GB/hora</p>
            <p><strong>Persistent Volume:</strong> {pricingService.formatPrice(pricing.storage.volumeDisk.price)}/GB/hora</p>
          </div>
          <div>
            <p><strong>Límite Container:</strong> {pricing.limits.containerDiskMax} GB</p>
            <p><strong>Límite Volume:</strong> {pricing.limits.volumeDiskMax} GB</p>
          </div>
        </div>
        {pricing.freeTier.enabled && (
          <p className="mt-2 text-sm font-medium text-green-600">
            🎉 Free Tier: {pricingService.formatPrice(pricing.freeTier.initialBalance)} de saldo inicial para nuevos usuarios
          </p>
        )}
      </div>
    </div>
  );
};
