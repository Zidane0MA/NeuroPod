import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Zap, Wifi, WifiOff } from "lucide-react";
import { Pod } from "@/types/pod";
import { PodStats } from "./PodStats";
import { PodActions } from "./PodActions";
import { usePodUpdates } from "@/hooks/usePodUpdates";

interface PodCardProps {
  pod: Pod;
  onTogglePod: (podId: string) => void;
  onDeletePod: (podId: string) => void;
  viewLogs: (podName: string) => void;
  logs: string;
  onPodUpdate?: (updatedPod: Pod) => void; // Nueva prop para manejar actualizaciones
}

export const PodCard: React.FC<PodCardProps> = ({
  pod: initialPod,
  onTogglePod,
  onDeletePod,
  viewLogs,
  logs,
  onPodUpdate
}) => {
  // 🔧 Asegurar que el pod tenga las propiedades necesarias
  const sanitizePod = (podData: any) => ({
    ...podData,
    httpServices: podData.httpServices || [],
    tcpServices: podData.tcpServices || [],
    stats: podData.stats || {}
  });
  
  // 🔄 Estado local del pod y WebSocket
  const [pod, setPod] = useState(() => sanitizePod(initialPod));
  const { podData, connectionStatus } = usePodUpdates(pod.podId);
  
  // 📡 Actualizar pod cuando llegan datos por WebSocket
  useEffect(() => {
    if (podData) {
      const updatedPod = {
        ...pod,
        status: podData.status,
        stats: podData.stats || pod.stats,
        // 🔧 Arreglo: Agregar fallback para arrays undefined
        httpServices: (podData.httpServices || pod.httpServices || []).map((svc: any) => ({
          ...svc,
          isCustom: svc.isCustom ?? false
        })),
        tcpServices: (podData.tcpServices || pod.tcpServices || []).map((svc: any) => ({
          ...svc,
          isCustom: svc.isCustom ?? false
        }))
      };
      
      setPod(updatedPod);
      
      // Notificar al componente padre si es necesario
      if (onPodUpdate) {
        onPodUpdate(updatedPod);
      }
      
      console.log(`📊 Pod ${pod.podId} actualizado via WebSocket:`, podData);
    }
  }, [podData, pod.podId, onPodUpdate]);
  
  // 🔄 Actualizar cuando cambie el pod inicial (props)
  useEffect(() => {
    setPod(sanitizePod(initialPod));
  }, [initialPod]);
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
    <Card key={pod.podId}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {pod.podName}
            {getStatusBadge(pod.status)}
            
            {/* 📡 Indicador de conexión WebSocket */}
            <div className="flex items-center gap-1 ml-2">
              {connectionStatus.connected ? (
                <Wifi className="h-4 w-4 text-green-500" title="Conexión en tiempo real activa" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" title="Sin conexión en tiempo real" />
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>{getGpuModel(String(pod.gpu || "Sin GPU"))}</span>
            
            {/* 🕐 Indicador de última actualización */}
            {podData && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-green-600 text-xs">
                  Actualizado {new Date(podData.timestamp).toLocaleTimeString()}
                </span>
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
