
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Cpu, Server, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";

export const PricingCards = () => {
  const gpuOptions = [
    {
      id: "rtx-4050",
      name: "RTX 4050",
      description: "Ideal para cargas de trabajo medianas y contenedores de desarrollo",
      price: "2.50€",
      priceUnit: "por hora",
      features: [
        "CUDA Cores: 2,560",
        "6GB GDDR6",
        "Hasta 4 contenedores simultáneos",
        "Soporte para CUDA y cuDNN",
        "SSD de alta velocidad incluido",
      ],
      icon: Cpu,
      available: true,
      popular: true,
    },
    {
      id: "rtx-4080",
      name: "RTX 4080",
      description: "Para contenedores de alto rendimiento y procesamiento masivo",
      price: "5.75€",
      priceUnit: "por hora",
      features: [
        "CUDA Cores: 9,728",
        "16GB GDDR6X",
        "Hasta 8 contenedores simultáneos",
        "Memoria de alta velocidad",
        "Almacenamiento SSD NVMe",
      ],
      icon: Server,
      available: false,
      popular: false,
    },
    {
      id: "rtx-4090",
      name: "RTX 4090",
      description: "Máximo rendimiento para aplicaciones exigentes",
      price: "8.90€",
      priceUnit: "por hora",
      features: [
        "CUDA Cores: 16,384",
        "24GB GDDR6X",
        "Contenedores ilimitados",
        "Procesamiento paralelo avanzado",
        "Almacenamiento SSD NVMe Premium",
      ],
      icon: HardDrive,
      available: false,
      popular: false,
    },
  ];

  return (
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
  );
};
