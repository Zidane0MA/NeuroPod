// Servicio corregido para WebSockets usando Socket.IO client
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;
  private subscribedPods = new Set<string>();

  connect() {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No hay token disponible para WebSocket');
      this.isConnecting = false;
      return;
    }

    // 🔧 CORREGIDO: Determinar URL del servidor con detección automática de HTTPS
    let serverUrl: string;
    
    // Detectar si estamos en producción basándose en el protocolo y hostname
    const isHTTPS = window.location.protocol === 'https:';
    const isProductionDomain = window.location.hostname.includes('neuropod.online');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isProductionDomain && isHTTPS) {
      // Producción con HTTPS → usar api.neuropod.online con HTTPS
      serverUrl = 'https://api.neuropod.online';
      console.log('🌐 WebSocket: Modo producción HTTPS detectado → usando', serverUrl);
    } else if (isLocalhost) {
      // Desarrollo local → usar localhost con HTTP
      serverUrl = `http://${window.location.hostname}:3000`;
      console.log('🛠️ WebSocket: Modo desarrollo local detectado → usando', serverUrl);
    } else {
      // Fallback para otros casos
      serverUrl = import.meta.env.PROD 
        ? 'https://api.neuropod.online'
        : `http://${window.location.hostname}:3000`;
      console.log('⚠️ WebSocket: Fallback detectado → usando', serverUrl);
    }

    try {
      // Crear conexión Socket.IO con autenticación
      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        retries: 3
      });

      // Eventos de conexión
      this.socket.on('connect', () => {
        console.log('🔌 WebSocket conectado');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Reenviar suscripciones existentes
        this.subscribedPods.forEach(podId => {
          this.subscribeToPod(podId);
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket desconectado:', reason);
        this.isConnecting = false;

        // Reconectar automáticamente excepto si fue manual
        if (reason !== 'io client disconnect') {
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión WebSocket:', error);
        this.isConnecting = false;
        this.handleReconnect();
      });

      // Evento de confirmación de conexión
      this.socket.on('connected', (data) => {
        console.log('✅ WebSocket autenticado:', data);
      });

      // Eventos específicos de pods
      this.socket.on('podUpdate', (data) => {
        console.log('📊 Pod update recibido:', data);
        // Emitir evento customizado para que los componentes escuchen
        window.dispatchEvent(new CustomEvent('podUpdate', { detail: data }));
      });

      this.socket.on('podCreated', (data) => {
        console.log('🚀 Pod creado:', data);
        window.dispatchEvent(new CustomEvent('podCreated', { detail: data }));
      });

      this.socket.on('podDeleted', (data) => {
        console.log('🗑️ Pod eliminado:', data);
        window.dispatchEvent(new CustomEvent('podDeleted', { detail: data }));
      });

      this.socket.on('podLogs', (data) => {
        console.log('📝 Logs recibidos para pod:', data.podId);
        window.dispatchEvent(new CustomEvent('podLogs', { detail: data }));
      });

      // Eventos administrativos
      this.socket.on('adminNotification', (data) => {
        console.log('👑 Notificación admin:', data);
        window.dispatchEvent(new CustomEvent('adminNotification', { detail: data }));
      });

      this.socket.on('lowBalanceAlert', (data) => {
        console.log('💰 Alerta de saldo bajo:', data);
        window.dispatchEvent(new CustomEvent('lowBalanceAlert', { detail: data }));
      });

      // Eventos de suscripción
      this.socket.on('subscribed', (data) => {
        console.log('✅ Suscrito a pod:', data.podId);
      });

      this.socket.on('unsubscribed', (data) => {
        console.log('❌ Desuscrito de pod:', data.podId);
      });

      // Manejo de errores
      this.socket.on('error', (error) => {
        console.error('❌ Error WebSocket:', error);
      });

      // Ping/Pong para mantener conexión
      this.socket.on('pong', (data) => {
        // console.log('🏓 Pong recibido:', data);
      });

    } catch (error) {
      console.error('❌ Error al crear conexión WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscribedPods.clear();
  }

  // Manejar reconexión con backoff exponencial
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const timeout = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
      this.reconnectAttempts++;

      console.log(`🔄 Reconectando en ${timeout}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, timeout);
    } else {
      console.error('❌ Máximo de intentos de reconexión alcanzado');
    }
  }

  // Suscribirse a actualizaciones de un pod específico
  subscribeToPod(podId: string, userId?: string) {
    if (!podId) {
      console.error('podId es requerido para suscripción');
      return;
    }

    // Agregar a la lista de pods suscritos
    this.subscribedPods.add(podId);

    // Conectar si no está conectado
    if (!this.socket?.connected) {
      this.connect();
    }

    // Enviar suscripción cuando esté conectado
    const sendSubscription = () => {
      if (this.socket?.connected) {
        this.socket.emit('subscribe', {
          podId,
          userId
        });
        console.log(`📡 Suscribiendo a pod: ${podId}`);
      }
    };

    if (this.socket?.connected) {
      sendSubscription();
    } else {
      // Esperar a conectar y luego suscribir
      this.socket?.once('connect', sendSubscription);
    }
  }

  // Desuscribirse de un pod
  unsubscribeFromPod(podId: string) {
    this.subscribedPods.delete(podId);

    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { podId });
      console.log(`📡 Desuscribiendo de pod: ${podId}`);
    }

    // Si no hay más suscriptores, mantener conexión para otros eventos
    // No desconectar automáticamente ya que puede haber otros eventos
  }

  // Solicitar logs de un pod
  requestPodLogs(podId: string) {
    if (!this.socket?.connected) {
      console.error('WebSocket no conectado');
      return;
    }

    this.socket.emit('requestLogs', { podId });
    console.log(`📝 Solicitando logs para pod: ${podId}`);
  }

  // Enviar ping para mantener conexión
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // Obtener estado de conexión
  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      connecting: this.isConnecting,
      subscribedPods: Array.from(this.subscribedPods),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Método helper para componentes React
  onPodUpdate(podId: string, callback: (data: any) => void) {
    // Si es wildcard (*), escuchar todas las actualizaciones
    if (podId === '*') {
      const handleUpdate = (event: CustomEvent) => {
        callback(event.detail);
      };

      window.addEventListener('podUpdate', handleUpdate as EventListener);

      // Retornar función de limpieza
      return () => {
        window.removeEventListener('podUpdate', handleUpdate as EventListener);
      };
    } else {
      // Suscribirse al pod específico
      this.subscribeToPod(podId);

      // Escuchar eventos de actualización
      const handleUpdate = (event: CustomEvent) => {
        if (event.detail.podId === podId) {
          callback(event.detail);
        }
      };

      window.addEventListener('podUpdate', handleUpdate as EventListener);

      // Retornar función de limpieza
      return () => {
        window.removeEventListener('podUpdate', handleUpdate as EventListener);
        this.unsubscribeFromPod(podId);
      };
    }
  }

  // Método helper para logs
  onPodLogs(podId: string, callback: (logs: string) => void) {
    const handleLogs = (event: CustomEvent) => {
      if (event.detail.podId === podId) {
        callback(event.detail.logs);
      }
    };

    window.addEventListener('podLogs', handleLogs as EventListener);

    return () => {
      window.removeEventListener('podLogs', handleLogs as EventListener);
    };
  }

  // 🔧 NUEVO: Método helper para notificaciones de pods creados
  onPodCreated(callback: (data: any) => void) {
    const handleCreated = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('podCreated', handleCreated as EventListener);

    return () => {
      window.removeEventListener('podCreated', handleCreated as EventListener);
    };
  }

  // 🔧 NUEVO: Método helper para notificaciones de pods eliminados
  onPodDeleted(callback: (data: any) => void) {
    const handleDeleted = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('podDeleted', handleDeleted as EventListener);

    return () => {
      window.removeEventListener('podDeleted', handleDeleted as EventListener);
    };
  }

  // 🔧 NUEVO: Método helper para notificaciones administrativas
  onAdminNotification(callback: (data: any) => void) {
    const handleAdmin = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('adminNotification', handleAdmin as EventListener);

    return () => {
      window.removeEventListener('adminNotification', handleAdmin as EventListener);
    };
  }

  // 🔧 NUEVO: Método helper para alertas de saldo bajo
  onLowBalanceAlert(callback: (data: any) => void) {
    const handleLowBalance = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('lowBalanceAlert', handleLowBalance as EventListener);

    return () => {
      window.removeEventListener('lowBalanceAlert', handleLowBalance as EventListener);
    };
  }
}

// Exportar instancia singleton
export default new WebSocketService();