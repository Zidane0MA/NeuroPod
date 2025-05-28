const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User.model');
const Session = require('./models/Session.model');
const Pod = require('./models/Pod.model');
const { logAction } = require('./utils/logger');

/**
 * Configuración de Socket.IO para NeuroPod
 * @param {object} server - Servidor HTTP
 */
const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://app.neuropod.online', 'https://neuropod.online']
        : ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware para autenticación
  io.use(async (socket, next) => {
    try {
      // Obtener token del handshake
      const token = socket.handshake.auth.token || 
                    socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('No token provided'));
      }
      
      try {
        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que la sesión existe
        const session = await Session.findOne({ token });
        if (!session) {
          return next(new Error('Invalid session'));
        }
        
        // Obtener usuario
        const user = await User.findById(decoded.id);
        if (!user) {
          return next(new Error('User not found'));
        }
        
        // Añadir usuario a la conexión socket
        socket.user = user;
        socket.userId = user._id.toString();
        socket.userRole = user.role;
        
        // Registrar conexión
        await logAction(user._id, 'SOCKET_CONNECT', { 
          socketId: socket.id,
          userAgent: socket.request.headers['user-agent']
        });
        
        next();
        
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError.message);
        next(new Error('Invalid or expired token'));
      }
      
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Manejar errores de conexión
  io.engine.on('connection_error', (err) => {
    console.log('Socket connection error:', err.req);
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
    console.log('Error context:', err.context);
  });

  // Conexión establecida
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: User ${socket.user.email} (${socket.userId})`);
    
    // Unir al usuario a salas relevantes
    socket.join(`user:${socket.userId}`);
    
    if (socket.userRole === 'admin') {
      socket.join('admins');
      console.log(`👑 Admin user ${socket.user.email} joined admin room`);
    }
    
    // Enviar confirmación de conexión
    socket.emit('connected', { 
      message: `Connected as ${socket.user.name}`,
      userId: socket.userId,
      role: socket.userRole,
      timestamp: new Date().toISOString()
    });
    
    // === EVENTOS PARA PODS ===
    
    // Suscribirse a actualizaciones de un pod específico
    socket.on('subscribe', async (data) => {
      try {
        const { podId, userId } = data;
        
        if (!podId) {
          return socket.emit('error', { 
            type: 'INVALID_REQUEST',
            message: 'Pod ID is required' 
          });
        }
        
        // Buscar pod por podId (no por _id)
        const pod = await Pod.findOne({ podId });
        
        if (!pod) {
          return socket.emit('error', { 
            type: 'POD_NOT_FOUND',
            message: 'Pod not found',
            podId
          });
        }
        
        // Verificar acceso
        const hasAccess = socket.userRole === 'admin' || 
                         pod.userId.toString() === socket.userId;
        
        if (!hasAccess) {
          return socket.emit('error', { 
            type: 'ACCESS_DENIED',
            message: 'No access to this pod',
            podId
          });
        }
        
        // Unir a la sala del pod
        const roomName = `pod:${podId}`;
        socket.join(roomName);
        
        console.log(`📡 User ${socket.user.email} subscribed to pod ${podId}`);
        
        // Enviar estado actual del pod
        socket.emit('podUpdate', {
          type: 'podUpdate',
          podId: pod.podId,
          status: pod.status,
          stats: pod.stats,
          timestamp: new Date().toISOString()
        });
        
        // Confirmar suscripción
        socket.emit('subscribed', {
          podId,
          message: `Subscribed to pod ${pod.podName}`
        });
        
      } catch (error) {
        console.error('Error subscribing to pod:', error);
        socket.emit('error', { 
          type: 'SUBSCRIPTION_ERROR',
          message: 'Failed to subscribe to pod updates',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
    
    // Desuscribirse de un pod
    socket.on('unsubscribe', (data) => {
      try {
        const { podId } = data;
        
        if (!podId) {
          return socket.emit('error', { 
            type: 'INVALID_REQUEST',
            message: 'Pod ID is required' 
          });
        }
        
        const roomName = `pod:${podId}`;
        socket.leave(roomName);
        
        console.log(`📡 User ${socket.user.email} unsubscribed from pod ${podId}`);
        
        socket.emit('unsubscribed', {
          podId,
          message: `Unsubscribed from pod ${podId}`
        });
        
      } catch (error) {
        console.error('Error unsubscribing from pod:', error);
        socket.emit('error', { 
          type: 'UNSUBSCRIPTION_ERROR',
          message: 'Failed to unsubscribe from pod',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
    
    // Solicitar logs de un pod
    socket.on('requestLogs', async (data) => {
      try {
        const { podId } = data;
        
        if (!podId) {
          return socket.emit('error', { 
            type: 'INVALID_REQUEST',
            message: 'Pod ID is required' 
          });
        }
        
        const pod = await Pod.findOne({ podId });
        
        if (!pod) {
          return socket.emit('error', { 
            type: 'POD_NOT_FOUND',
            message: 'Pod not found',
            podId
          });
        }
        
        // Verificar acceso
        const hasAccess = socket.userRole === 'admin' || 
                         pod.userId.toString() === socket.userId;
        
        if (!hasAccess) {
          return socket.emit('error', { 
            type: 'ACCESS_DENIED',
            message: 'No access to this pod',
            podId
          });
        }
        
        // Generar logs (en implementación real, obtener de Kubernetes)
        const logs = generatePodLogs(pod);
        
        socket.emit('podLogs', {
          podId,
          logs,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error getting pod logs:', error);
        socket.emit('error', { 
          type: 'LOGS_ERROR',
          message: 'Failed to get pod logs',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
    
    // Ping/Pong para mantener conexión viva
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
    
    // Manejar errores del socket
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
    
    // Desconexión
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Socket disconnected: User ${socket.user.email} - Reason: ${reason}`);
      
      try {
        // Registrar desconexión
        await logAction(socket.user._id, 'SOCKET_DISCONNECT', { 
          socketId: socket.id,
          reason
        });
      } catch (error) {
        console.error('Error logging socket disconnect:', error);
      }
    });
  });
  
  // === FUNCIONES PARA ENVIAR ACTUALIZACIONES ===
  
  /**
   * Enviar actualización de estado de pod a clientes suscritos
   * @param {string} podId - ID del pod
   * @param {Object} updateData - Datos de actualización
   */
  const sendPodUpdate = async (podId, updateData) => {
    try {
      const roomName = `pod:${podId}`;
      const clientsInRoom = await io.in(roomName).fetchSockets();
      
      if (clientsInRoom.length > 0) {
        console.log(`📡 Sending pod update to ${clientsInRoom.length} clients for pod ${podId}`);
        
        io.to(roomName).emit('podUpdate', {
          type: 'podUpdate',
          podId,
          ...updateData,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error sending pod update:', error);
    }
  };
  
  /**
   * Enviar notificación de pod creado
   * @param {string} userId - ID del usuario
   * @param {Object} podData - Datos del pod
   */
  const notifyPodCreated = (userId, podData) => {
    try {
      io.to(`user:${userId}`).emit('podCreated', {
        type: 'podCreated',
        ...podData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 Notified user ${userId} of pod creation`);
      
    } catch (error) {
      console.error('Error notifying pod creation:', error);
    }
  };
  
  /**
   * Enviar notificación de pod eliminado
   * @param {string} userId - ID del usuario
   * @param {string} podId - ID del pod eliminado
   */
  const notifyPodDeleted = (userId, podId) => {
    try {
      io.to(`user:${userId}`).emit('podDeleted', {
        type: 'podDeleted',
        podId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 Notified user ${userId} of pod deletion: ${podId}`);
      
    } catch (error) {
      console.error('Error notifying pod deletion:', error);
    }
  };
  
  /**
   * Enviar notificación a administradores
   * @param {string} eventType - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  const notifyAdmins = (eventType, data) => {
    try {
      io.to('admins').emit('adminNotification', {
        type: eventType,
        ...data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 Sent admin notification: ${eventType}`);
      
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  };
  
  /**
   * Enviar alerta de saldo bajo
   * @param {string} userId - ID del usuario
   * @param {Object} balanceData - Información del saldo
   */
  const sendLowBalanceAlert = (userId, balanceData) => {
    try {
      io.to(`user:${userId}`).emit('lowBalanceAlert', {
        type: 'lowBalanceAlert',
        ...balanceData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 Sent low balance alert to user ${userId}`);
      
    } catch (error) {
      console.error('Error sending low balance alert:', error);
    }
  };
  
  // Exponer funciones útiles en el objeto io
  io.sendPodUpdate = sendPodUpdate;
  io.notifyPodCreated = notifyPodCreated;
  io.notifyPodDeleted = notifyPodDeleted;
  io.notifyAdmins = notifyAdmins;
  io.sendLowBalanceAlert = sendLowBalanceAlert;
  
  // Método para cerrar correctamente
  io.gracefulClose = () => {
    console.log('📵 Cerrando todas las conexiones WebSocket...');
    io.sockets.sockets.forEach((socket) => {
      socket.disconnect(true);
    });
    io.close();
  };
  
  return io;
};

// === FUNCIONES AUXILIARES ===

/**
 * Generar logs ficticios para un pod
 * @param {Object} pod - Objeto del pod
 * @returns {Array} - Array de líneas de log
 */
function generatePodLogs(pod) {
  const baseTime = new Date(pod.createdAt);
  const logs = [];
  
  // Logs básicos de inicio
  logs.push({
    timestamp: new Date(baseTime.getTime()).toISOString(),
    level: 'INFO',
    message: `Iniciando pod ${pod.podName}...`
  });
  
  logs.push({
    timestamp: new Date(baseTime.getTime() + 1000).toISOString(),
    level: 'INFO',
    message: `Usando imagen Docker: ${pod.dockerImage}`
  });
  
  logs.push({
    timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
    level: 'INFO',
    message: `Asignando GPU: ${pod.gpu}`
  });
  
  logs.push({
    timestamp: new Date(baseTime.getTime() + 3000).toISOString(),
    level: 'INFO',
    message: `Configurando almacenamiento: Container ${pod.containerDiskSize}GB, Volume ${pod.volumeDiskSize}GB`
  });
  
  // Logs específicos según el tipo de deployment
  if (pod.deploymentType === 'template' && pod.templateId) {
    logs.push({
      timestamp: new Date(baseTime.getTime() + 4000).toISOString(),
      level: 'INFO',
      message: 'Aplicando configuración de template...'
    });
  }
  
  // Logs de puertos
  if (pod.httpServices && pod.httpServices.length > 0) {
    pod.httpServices.forEach((service, index) => {
      logs.push({
        timestamp: new Date(baseTime.getTime() + 5000 + (index * 500)).toISOString(),
        level: 'INFO',
        message: `Configurando servicio ${service.serviceName} en puerto ${service.port}`
      });
    });
  }
  
  // Logs de Jupyter si está habilitado
  if (pod.enableJupyter) {
    logs.push({
      timestamp: new Date(baseTime.getTime() + 7000).toISOString(),
      level: 'INFO',
      message: 'Instalando y configurando Jupyter Lab...'
    });
    
    logs.push({
      timestamp: new Date(baseTime.getTime() + 8000).toISOString(),
      level: 'INFO',
      message: 'Jupyter Lab iniciado en puerto 8888'
    });
    
    if (pod.httpServices.find(s => s.jupyterToken)) {
      const service = pod.httpServices.find(s => s.jupyterToken);
      logs.push({
        timestamp: new Date(baseTime.getTime() + 9000).toISOString(),
        level: 'INFO',
        message: `Token de Jupyter generado: ${service.jupyterToken.substring(0, 8)}...`
      });
    }
  }
  
  // Logs según el estado actual
  switch (pod.status) {
    case 'running':
      logs.push({
        timestamp: new Date(baseTime.getTime() + 10000).toISOString(),
        level: 'SUCCESS',
        message: `Pod ${pod.podName} iniciado correctamente y en ejecución`
      });
      
      // Añadir logs de métricas si existen
      if (pod.stats) {
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: `Métricas actuales: CPU ${pod.stats.cpuUsage || 0}%, Memoria ${pod.stats.memoryUsage || 0}%, GPU ${pod.stats.gpuUsage || 0}%`
        });
      }
      break;
      
    case 'stopped':
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Pod ${pod.podName} detenido correctamente`
      });
      break;
      
    case 'error':
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: `Error en el pod ${pod.podName}. Revisar configuración.`
      });
      break;
      
    case 'creating':
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Pod ${pod.podName} inicializándose...`
      });
      break;
  }
  
  return logs;
}

module.exports = setupSocket;
