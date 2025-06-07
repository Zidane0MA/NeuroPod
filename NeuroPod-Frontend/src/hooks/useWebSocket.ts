import { useEffect, useRef } from 'react';
import webSocketService from '@/services/websocket.service';

/**
 * Hook principal para inicializar WebSocket
 * Debe usarse una sola vez en el layout principal
 */
export function useWebSocket() {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      // Conectar WebSocket cuando se monta el primer componente
      console.log('🔌 Inicializando WebSocket desde useWebSocket hook');
      webSocketService.connect();
      isInitialized.current = true;
    }

    // Cleanup al desmontar (pero no desconectar para permitir múltiples componentes)
    return () => {
      // No desconectar automáticamente para permitir que otros componentes usen WebSocket
      console.log('🔌 useWebSocket cleanup (manteniendo conexión)');
    };
  }, []);

  return {
    service: webSocketService,
    getConnectionStatus: () => webSocketService.getConnectionStatus()
  };
}
