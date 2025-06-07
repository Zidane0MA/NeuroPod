import { useState, useEffect, useCallback } from 'react';
import webSocketService from '@/services/websocket.service';

interface PodUpdateData {
  podId: string;
  status: string;
  stats?: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage: number;
    uptime: number;
    lastUpdated: string;
  };
  httpServices?: Array<{
    port: number;
    serviceName: string;
    status: string;
    url: string;
  }>;
  tcpServices?: Array<{
    port: number;
    serviceName: string;
    status: string;
    url: string;
  }>;
  message?: string;
  timestamp: string;
}

/**
 * Hook para recibir actualizaciones en tiempo real de un pod específico
 * @param podId - ID del pod a monitorear
 * @param userId - ID del usuario (opcional)
 */
export function usePodUpdates(podId: string, userId?: string) {
  const [podData, setPodData] = useState<PodUpdateData | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState(
    webSocketService.getConnectionStatus()
  );

  // Actualizar estado de conexión periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus(webSocketService.getConnectionStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!podId) {
      console.warn('usePodUpdates: podId es requerido');
      return;
    }

    console.log(`📡 usePodUpdates: Suscribiendo a pod ${podId}`);

    // Conectar WebSocket si no está conectado
    webSocketService.connect();

    // Suscribirse a actualizaciones del pod
    const unsubscribePod = webSocketService.onPodUpdate(podId, (data: PodUpdateData) => {
      console.log(`📊 Pod update recibido para ${podId}:`, data);
      setPodData(data);
    });

    // Suscribirse a logs del pod
    const unsubscribeLogs = webSocketService.onPodLogs(podId, (logData: string) => {
      console.log(`📝 Logs recibidos para ${podId}`);
      setLogs(logData);
    });

    // Cleanup
    return () => {
      console.log(`📡 usePodUpdates: Limpiando suscripciones para pod ${podId}`);
      unsubscribePod();
      unsubscribeLogs();
    };
  }, [podId, userId]);

  // Función para solicitar logs manualmente
  const requestLogs = useCallback(() => {
    if (!podId) {
      console.error('usePodUpdates: No se puede solicitar logs sin podId');
      return;
    }
    
    console.log(`📝 Solicitando logs para pod ${podId}`);
    webSocketService.requestPodLogs(podId);
  }, [podId]);

  // Función para forzar actualización de conexión
  const refreshConnection = useCallback(() => {
    webSocketService.connect();
  }, []);

  return {
    podData,
    logs,
    connectionStatus,
    requestLogs,
    refreshConnection,
    isConnected: connectionStatus.connected,
    subscribedPods: connectionStatus.subscribedPods
  };
}
