import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pod } from "@/types/pod";
import { usePodUpdates } from "@/hooks/usePodUpdates";

interface PodLogsDialogProps {
  pod: Pod;
  viewLogs: (podId: string) => void;
  logs: string;
}

export const PodLogsDialog: React.FC<PodLogsDialogProps> = ({ pod, viewLogs, logs: fallbackLogs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayLogs, setDisplayLogs] = useState(fallbackLogs || "");
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // 📡 WebSocket para logs en tiempo real
  const { logs: realtimeLogs, connectionStatus, requestLogs } = usePodUpdates(pod.podId);
  
  // 📜 Actualizar logs cuando llegan datos por WebSocket
  useEffect(() => {
    if (realtimeLogs) {
      console.log(`📝 Logs en tiempo real recibidos para ${pod.podId}`);
      setDisplayLogs(realtimeLogs);
      
      // Auto-scroll hacia abajo cuando se agregan nuevos logs
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [realtimeLogs, pod.podId]);
  
  // 🔄 Usar logs de fallback si no hay logs de WebSocket
  useEffect(() => {
    if (!realtimeLogs && fallbackLogs) {
      setDisplayLogs(fallbackLogs);
    }
  }, [fallbackLogs, realtimeLogs]);

  const handleOpenLogs = () => {
    setIsOpen(true);
    // Solicitar logs inmediatamente cuando se abre
    requestLogs();
    // También usar el método tradicional como fallback
    viewLogs(pod.podId);
  };

  const handleRefreshLogs = () => {
    console.log(`🔄 Solicitando actualización de logs para ${pod.podId}`);
    requestLogs();
    viewLogs(pod.podId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex gap-2 items-center"
          onClick={handleOpenLogs}
        >
          <Terminal className="h-4 w-4" />
          Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Logs de {pod.podName}
                
                {/* 📡 Indicador de conexión WebSocket */}
                <div className="flex items-center gap-1">
                  {connectionStatus.connected ? (
                    <Wifi className="h-4 w-4 text-green-500" title="Logs en tiempo real" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" title="Sin conexión en tiempo real" />
                  )}
                </div>
              </DialogTitle>
              <DialogDescription>
                {connectionStatus.connected ? (
                  <span className="text-green-600">
                    🟢 Logs en tiempo real - Actualización automática
                  </span>
                ) : (
                  <span>
                    Registro de actividad del pod
                  </span>
                )}
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefreshLogs}
              className="h-8 w-8"
              title={connectionStatus.connected ? "Forzar actualización" : "Actualizar logs"}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="mt-4">
          <div className="bg-black rounded-md p-4 h-[300px] text-white font-mono text-sm overflow-auto whitespace-pre-line relative">
            {displayLogs || "No hay logs disponibles."}
            
            {/* 📍 Marcador para auto-scroll */}
            <div ref={logsEndRef} />
            
            {/* 🔄 Indicador de carga si está conectando */}
            {connectionStatus.connecting && (
              <div className="absolute top-2 right-2 text-yellow-400 text-xs">
                Conectando...
              </div>
            )}
            
            {/* 🟢 Indicador de tiempo real */}
            {connectionStatus.connected && (
              <div className="absolute top-2 right-2 text-green-400 text-xs animate-pulse">
                • EN VIVO
              </div>
            )}
          </div>
          
          {/* 📊 Footer con información */}
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {connectionStatus.connected ? (
              <span className="text-green-600">
                📡 Los logs se actualizan automáticamente
              </span>
            ) : (
              <span>
                ⚠️ Conexión perdida - Usa el botón de actualizar para obtener logs
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
