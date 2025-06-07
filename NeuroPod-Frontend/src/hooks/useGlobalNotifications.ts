import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import webSocketService from '@/services/websocket.service';

/**
 * Hook para manejar notificaciones globales de WebSocket
 * Debe usarse en el layout principal para recibir todas las notificaciones
 */
export function useGlobalNotifications() {
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔔 Inicializando notificaciones globales');
    
    // Conectar WebSocket
    webSocketService.connect();

    // === EVENTOS DE PODS ===
    
    const handlePodCreated = (event: CustomEvent) => {
      const data = event.detail;
      console.log('🚀 Notificación: Pod creado', data);
      
      toast({
        title: "🚀 Pod Creado",
        description: `${data.podName} se está creando`,
        duration: 5000,
      });
    };

    const handlePodDeleted = (event: CustomEvent) => {
      const data = event.detail;
      console.log('🗑️ Notificación: Pod eliminado', data);
      
      toast({
        title: "🗑️ Pod Eliminado",
        description: `Pod ${data.podId} eliminado correctamente`,
        variant: "destructive",
        duration: 5000,
      });
    };

    // === EVENTOS DE SALDO ===
    
    const handleLowBalance = (event: CustomEvent) => {
      const data = event.detail;
      console.log('💰 Notificación: Saldo bajo', data);
      
      toast({
        title: "💰 Saldo Bajo",
        description: data.message || `Tu saldo actual es €${data.currentBalance}`,
        variant: "destructive",
        duration: 8000,
      });
    };

    const handleBalanceUpdate = (event: CustomEvent) => {
      const data = event.detail;
      console.log('💰 Notificación: Saldo actualizado', data);
      
      toast({
        title: "💰 Saldo Actualizado",
        description: `Tu nuevo saldo es €${data.newBalance}`,
        duration: 5000,
      });
    };

    // === EVENTOS ADMINISTRATIVOS ===
    
    const handleAdminNotification = (event: CustomEvent) => {
      const data = event.detail;
      console.log('👑 Notificación: Admin', data);
      
      toast({
        title: "👑 Notificación del Sistema",
        description: data.message || 'Nueva notificación administrativa',
        duration: 6000,
      });
    };

    // === EVENTOS DE CONEXIÓN ===
    
    const handleWebSocketReconnect = () => {
      toast({
        title: "🔌 Reconectado",
        description: "Conexión en tiempo real restablecida",
        duration: 3000,
      });
    };

    const handleWebSocketError = () => {
      toast({
        title: "⚠️ Conexión Perdida",
        description: "Intentando reconectar...",
        variant: "destructive",
        duration: 4000,
      });
    };

    // === AGREGAR LISTENERS ===
    
    // Eventos de pods
    window.addEventListener('podCreated', handlePodCreated as EventListener);
    window.addEventListener('podDeleted', handlePodDeleted as EventListener);
    
    // Eventos de saldo
    window.addEventListener('lowBalanceAlert', handleLowBalance as EventListener);
    window.addEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
    
    // Eventos administrativos
    window.addEventListener('adminNotification', handleAdminNotification as EventListener);
    
    // Eventos de conexión (custom events internos)
    window.addEventListener('websocketReconnected', handleWebSocketReconnect);
    window.addEventListener('websocketError', handleWebSocketError);

    // === CLEANUP ===
    
    return () => {
      console.log('🔔 Limpiando notificaciones globales');
      
      // Remover listeners de pods
      window.removeEventListener('podCreated', handlePodCreated as EventListener);
      window.removeEventListener('podDeleted', handlePodDeleted as EventListener);
      
      // Remover listeners de saldo
      window.removeEventListener('lowBalanceAlert', handleLowBalance as EventListener);
      window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
      
      // Remover listeners administrativos
      window.removeEventListener('adminNotification', handleAdminNotification as EventListener);
      
      // Remover listeners de conexión
      window.removeEventListener('websocketReconnected', handleWebSocketReconnect);
      window.removeEventListener('websocketError', handleWebSocketError);
    };
  }, [toast]);

  // Función para notificar manualmente
  const notify = (title: string, description: string, variant?: "default" | "destructive") => {
    toast({
      title,
      description,
      variant,
      duration: 5000,
    });
  };

  return {
    notify,
    connectionStatus: webSocketService.getConnectionStatus()
  };
}
