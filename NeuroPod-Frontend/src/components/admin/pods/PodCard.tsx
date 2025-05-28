import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Zap } from "lucide-react";
import { LegacyPod } from "@/types/pod";
import { PodStats } from "./PodStats";
import { PodActions } from "./PodActions";

interface PodCardProps {
  pod: LegacyPod;
  onTogglePod: (podId: string) => void;
  onDeletePod: (podId: string) => void;
  viewLogs: (podName: string) => void;
  logs: string;
}

export const PodCard: React.FC<PodCardProps> = ({
  pod,
  onTogglePod,
  onDeletePod,
  viewLogs,
  logs
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ejecutando</Badge>;
      case "stopped":
        return <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white">Detenido</Badge>;
      case "creating":
        return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Iniciando</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  // Función para extraer el modelo de GPU del string
  const getGpuModel = (gpu: string) => {
    if (!gpu) return "Sin GPU";
    
    // Si es un string como "rtx-4050", convertirlo a "RTX 4050"
    if (gpu.includes("-")) {
      return gpu.toUpperCase().replace("-", " ");
    }
    
    return gpu.toUpperCase();
  };

  return (
    <Card key={pod.id}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {pod.name}
            {getStatusBadge(pod.status)}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>{getGpuModel(String(pod.gpu ?? "Sin GPU"))}</span>
            {pod.user && (
              <>
                <span className="text-gray-300">•</span>
                <span>Usuario: {pod.user}</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <PodStats pod={pod} />
          </div>
          <div className="lg:col-span-2">
            <PodActions 
              pod={pod}
              onTogglePod={onTogglePod}
              onDeletePod={onDeletePod}
              viewLogs={viewLogs}
              logs={logs}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
