
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trash, ExternalLink } from "lucide-react";

interface InstanceProps {
  instance: {
    id: string;
    name: string;
    status: string;
    uptime: string;
    cpu: string;
    memory: string;
    gpu: string;
  };
}

export const InstanceCard = ({ instance }: InstanceProps) => {
  const isRunning = instance.status === "running";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/20 pb-2">
        <CardTitle className="text-lg">{instance.name}</CardTitle>
        <Badge variant={isRunning ? "default" : "secondary"} className={isRunning ? "bg-green-500" : ""}>
          {isRunning ? "Ejecutando" : "Detenido"}
        </Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Tiempo Activo</span>
            <span className="font-medium">{instance.uptime}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">CPU</span>
            <span className="font-medium">{instance.cpu}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Memoria</span>
            <span className="font-medium">{instance.memory}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">GPU</span>
            <span className="font-medium">{instance.gpu}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border pt-4">
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="outline" size="sm" className="text-red-500">
              <Square className="h-4 w-4 mr-1" />
              Detener
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="text-green-500">
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Trash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
        {isRunning && (
          <Button variant="default" size="sm" className="gap-1">
            <ExternalLink className="h-3 w-3" />
            Abrir UI
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
