// Servicio para WebSockets que permite actualizaciones en tiempo real de pods

class PodSocket {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers = new Map<string, (data: any) => void>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Determinar URL del WebSocket
    const wsUrl = import.meta.env.PROD 
      ? 'wss://api.neuropod.online/ws' 
      : `ws://${window.location.hostname}:3000/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket conectado');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Reenviar suscripciones existentes
        this.subscribers.forEach((callback, podId) => {
          this.subscribeToPod(podId);
        });
      };

      this.socket.onclose = () => {
        console.log('WebSocket desconectado');
        this.socket = null;
        this.isConnecting = false;

        // Intentar reconectar con backoff exponencial
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const timeout = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
          this.reconnectAttempts++;

          console.log(`Reconectando en ${timeout}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, timeout);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'podUpdate' && data.podId) {
            // Notificar a los suscriptores
            const callback = this.subscribers.get(data.podId);
            if (callback) {
              callback(data);
            }
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Error WebSocket:', error);
      };
    } catch (error) {
      console.error('Error al crear conexión WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.subscribers.clear();
  }

  subscribeToPod(podId: string, userId?: string) {
    if (!podId) return;

    // Conectar si no está conectado
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Enviar mensaje de suscripción cuando la conexión esté lista
    const sendSubscription = () => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'subscribe',
          podId,
          userId
        }));
      }
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      sendSubscription();
    } else {
      // Esperar a que se conecte
      const checkConnection = () => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          sendSubscription();
        } else if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    }
  }

  unsubscribeFromPod(podId: string) {
    this.subscribers.delete(podId);

    // Si no hay más suscriptores, desconectar
    if (this.subscribers.size === 0) {
      this.disconnect();
    }
  }

  onPodUpdate(podId: string, callback: (data: any) => void) {
    if (!podId || typeof callback !== 'function') return;

    // Guardar callback para este pod
    this.subscribers.set(podId, callback);

    // Iniciar suscripción
    const userId = JSON.parse(localStorage.getItem('user') || '{}')._id;
    this.subscribeToPod(podId, userId);

    // Devolver función para cancelar suscripción
    return () => {
      this.unsubscribeFromPod(podId);
    };
  }
}

// Exportar instancia singleton
export default new PodSocket();
