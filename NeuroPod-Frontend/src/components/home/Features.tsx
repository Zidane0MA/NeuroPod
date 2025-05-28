
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Globe, Lock, Zap, Container, PackageCheck } from "lucide-react";

export const Features = () => {
  const features = [
    {
      title: "Acceso Remoto",
      description: "Gestiona tus contenedores desde cualquier lugar a través de un navegador web.",
      icon: <Globe className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Alto Rendimiento",
      description: "Optimiza el rendimiento de tus contenedores con orquestación inteligente.",
      icon: <Zap className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Seguridad Avanzada",
      description: "Protege tus contenedores con autenticación segura y políticas de acceso.",
      icon: <Lock className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Escalabilidad",
      description: "Escala automáticamente tus contenedores según las necesidades de tu aplicación.",
      icon: <Container className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Despliegue Rápido",
      description: "Implementa contenedores en segundos con nuestra plataforma optimizada.",
      icon: <Box className="h-6 w-6 text-purple-500" />,
    },
    {
      title: "Gestión Centralizada",
      description: "Administra todos tus contenedores desde un único panel de control intuitivo.",
      icon: <PackageCheck className="h-6 w-6 text-purple-500" />,
    },
  ];

  return (
    <div className="bg-muted/50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Características Principales
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            NeuroPod ofrece una solución completa para gestionar contenedores de forma remota.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card border-border hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
