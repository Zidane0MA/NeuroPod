// Servicio para monitorear el estado de los pods y actualizar la base de datos
const Pod = require('../models/Pod.model');
const kubernetesService = require('./kubernetes.service');

class PodMonitorService {
  constructor() {
    this.monitoringInterval = null;
    this.io = null;
    this.isMonitoring = false;
    this.monitoringFrequency = 30000; // 30 segundos
  }

  // Inicializar el servicio de monitoreo con instancia de Socket.IO
  init(socketIO) {
    console.log('🔍 Iniciando servicio de monitoreo de pods...');
    
    this.io = socketIO;
    
    // Iniciar monitoreo periódico
    this.startPeriodicMonitoring();
    
    console.log('✅ Servicio de monitoreo de pods inicializado correctamente');
  }

  // Iniciar monitoreo periódico de pods
  startPeriodicMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  El monitoreo ya está en ejecución');
      return;
    }

    console.log('🔍 Iniciando monitoreo periódico de pods...');
    this.isMonitoring = true;
    
    // Verificar estado de pods cada 30 segundos
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorActivePods();
      } catch (error) {
        console.error('❌ Error en monitoreo periódico:', error);
      }
    }, this.monitoringFrequency);

    // Ejecutar una verificación inicial después de 5 segundos
    setTimeout(() => {
      this.monitorActivePods();
    }, 5000);
  }

  // Detener monitoreo
  stop() {
    if (this.isMonitoring && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('🛑 Servicio de monitoreo detenido correctamente');
    }
  }

  // Monitorear pods activos
  async monitorActivePods() {
    try {
      // Obtener todos los pods que no están detenidos
      const activePods = await Pod.find({ 
        status: { $in: ['running', 'creating'] } 
      });
      
      if (activePods.length === 0) {
        return;
      }
      
      console.log(`🔍 Monitoreando ${activePods.length} pods activos...`);
      
      // Verificar el estado de cada pod
      const monitoringPromises = activePods.map(pod => this.updatePodStatus(pod));
      
      // Esperar a que todos los monitoreos se completen
      await Promise.allSettled(monitoringPromises);
      
    } catch (error) {
      console.error('❌ Error monitoreando pods activos:', error);
    }
  }

  // Actualizar estado de un pod específico
  async updatePodStatus(pod) {
    try {
      const podName = pod.podName;
      const userHash = pod.userHash;
      
      if (!podName || !userHash) {
        console.warn(`⚠️  Pod ${pod.podId} tiene datos incompletos, saltando monitoreo`);
        return;
      }
      
      // Obtener estado actual desde Kubernetes
      const kubernetesData = await kubernetesService.getPodStatus(podName, userHash);
      
      // Validar que kubernetesData no sea undefined
      if (!kubernetesData) {
        console.warn(`⚠️  No se pudo obtener estado de K8s para pod ${podName}`);
        return;
      }
      
      // Verificar si hay cambios
      let hasChanges = false;
      const previousStatus = pod.status;
      
      // Actualizar estado del pod
      if (kubernetesData.status && kubernetesData.status !== pod.status) {
        pod.status = kubernetesData.status;
        hasChanges = true;
        
        console.log(`📊 Pod ${podName} cambió de estado: ${previousStatus} → ${kubernetesData.status}`);
        
        // Actualizar estado de servicios HTTP
        pod.httpServices.forEach(service => {
          const newStatus = this.getServiceStatus(kubernetesData.status);
          if (service.status !== newStatus) {
            service.status = newStatus;
          }
        });
        
        // Actualizar estado de servicios TCP
        pod.tcpServices.forEach(service => {
          if (service.status !== 'disable') {
            const newStatus = this.getServiceStatus(kubernetesData.status);
            if (service.status !== newStatus) {
              service.status = newStatus;
            }
          }
        });
      }
      
      // Actualizar métricas si están disponibles
      if (kubernetesData.metrics) {
        const oldStats = { ...pod.stats };
        pod.updateStats(kubernetesData.metrics);
        
        // Verificar si las métricas han cambiado significativamente
        if (this.hasSignificantMetricsChange(oldStats, pod.stats)) {
          hasChanges = true;
        }
      }
      
      // Actualizar lastActive si está ejecutándose
      if (kubernetesData.status === 'running') {
        pod.lastActive = new Date();
        hasChanges = true;
      }
      
      // Capturar token de Jupyter si es necesario
      if (kubernetesData.status === 'running' && pod.enableJupyter) {
        await this.handleJupyterToken(pod, podName, userHash);
      }
      
      // Guardar cambios si los hay
      if (hasChanges) {
        await pod.save();
        
        // Notificar a clientes suscritos por WebSocket
        this.notifyPodUpdate(pod);
      }
      
    } catch (error) {
      await this.handlePodError(pod, error);
    }
  }

  // Manejar errores del pod
  async handlePodError(pod, error) {
    // Si el pod no existe en Kubernetes pero está marcado como activo
    if (error.statusCode === 404 || (error.message && error.message.includes('404'))) {
      if (pod.status !== 'stopped') {
        console.log(`⚠️  Pod ${pod.podName} no encontrado en K8s, marcando como detenido`);
        
        pod.status = 'stopped';
        pod.httpServices.forEach(service => {
          service.status = 'stopped';
        });
        pod.tcpServices.forEach(service => {
          if (service.status !== 'disable') {
            service.status = 'stopped';
          }
        });
        
        await pod.save();
        this.notifyPodUpdate(pod);
      }
    } else if (error.message && !error.message.includes('timeout')) {
      // Solo logear errores que no sean timeouts
      console.error(`❌ Error verificando pod ${pod.podName}:`, error.message);
      
      // Si hay muchos errores consecutivos, marcar como error
      if (!pod.errorCount) pod.errorCount = 0;
      pod.errorCount++;
      
      if (pod.errorCount >= 3 && pod.status !== 'error') {
        pod.status = 'error';
        await pod.save();
        this.notifyPodUpdate(pod);
      }
    }
  }

  // Manejar token de Jupyter
  async handleJupyterToken(pod, podName, userHash) {
    try {
      const jupyterService = pod.httpServices.find(s => s.port === 8888);
      if (jupyterService && !jupyterService.jupyterToken) {
        const token = await kubernetesService.captureJupyterToken(podName, userHash);
        if (token) {
          jupyterService.jupyterToken = token;
          jupyterService.url = `${jupyterService.url.split('?')[0]}?token=${token}`;
          await pod.save();
          console.log(`🔑 Token de Jupyter capturado para pod ${podName}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error capturando token de Jupyter para pod ${podName}:`, error);
    }
  }

  // Obtener estado del servicio según el estado del pod
  getServiceStatus(podStatus) {
    switch (podStatus) {
      case 'running':
        return 'ready';
      case 'creating':
        return 'creating';
      case 'stopped':
        return 'stopped';
      case 'error':
        return 'error';
      default:
        return 'creating';
    }
  }

  // Verificar si las métricas han cambiado significativamente
  hasSignificantMetricsChange(oldStats, newStats) {
    if (!oldStats || !newStats) return true;
    
    // Considerar significativo si hay un cambio de más del 5%
    const threshold = 5;
    
    const cpuChange = Math.abs((newStats.cpuUsage || 0) - (oldStats.cpuUsage || 0));
    const memoryChange = Math.abs((newStats.memoryUsage || 0) - (oldStats.memoryUsage || 0));
    const gpuChange = Math.abs((newStats.gpuUsage || 0) - (oldStats.gpuUsage || 0));
    
    return cpuChange > threshold || memoryChange > threshold || gpuChange > threshold;
  }

  // Notificar actualización de pod por WebSocket
  notifyPodUpdate(pod) {
    if (!this.io) return;
    
    try {
      const podUpdate = {
        type: 'podUpdate',
        podId: pod.podId,
        status: pod.status,
        stats: pod.stats,
        httpServices: pod.httpServices.map(service => ({
          port: service.port,
          serviceName: service.serviceName,
          status: service.status,
          url: service.url
        })),
        timestamp: new Date().toISOString()
      };
      
      // Enviar actualización usando la función del socket
      this.io.sendPodUpdate(pod.podId, podUpdate);
      
    } catch (error) {
      console.error(`❌ Error enviando notificación WebSocket para pod ${pod.podId}:`, error);
    }
  }

  // Notificar a todos los clientes conectados
  broadcast(message) {
    if (!this.io) return;
    
    try {
      this.io.emit('broadcast', {
        ...message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error en broadcast:', error);
    }
  }

  // Obtener estadísticas del servicio
  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      monitoringFrequency: `${this.monitoringFrequency / 1000}s`,
      hasSocketIO: !!this.io,
      connectedClients: this.io ? this.io.engine.clientsCount : 0
    };
  }

  // Forzar actualización de un pod específico
  async forceUpdatePod(podId) {
    try {
      const pod = await Pod.findOne({ podId });
      if (!pod) {
        throw new Error('Pod no encontrado');
      }
      
      console.log(`🔄 Forzando actualización del pod ${podId}...`);
      await this.updatePodStatus(pod);
      
      return {
        podId: pod.podId,
        status: pod.status,
        stats: pod.stats,
        message: 'Pod actualizado correctamente'
      };
    } catch (error) {
      console.error(`❌ Error forzando actualización de pod ${podId}:`, error);
      throw error;
    }
  }

  // Monitorear pod específico una vez
  async monitorPod(podId) {
    try {
      const pod = await Pod.findOne({ podId });
      if (!pod) {
        throw new Error('Pod no encontrado');
      }
      
      console.log(`🔍 Monitoreando pod específico ${podId}...`);
      await this.updatePodStatus(pod);
      
      // Refrescar el pod desde la base de datos
      const updatedPod = await Pod.findOne({ podId });
      return updatedPod.getConnectionInfo();
    } catch (error) {
      console.error(`❌ Error monitoreando pod ${podId}:`, error);
      throw error;
    }
  }

  // Cambiar frecuencia de monitoreo
  setMonitoringFrequency(seconds) {
    if (seconds < 10 || seconds > 300) {
      throw new Error('La frecuencia debe estar entre 10 y 300 segundos');
    }
    
    this.monitoringFrequency = seconds * 1000;
    
    if (this.isMonitoring) {
      // Reiniciar con nueva frecuencia
      this.stop();
      this.startPeriodicMonitoring();
    }
    
    console.log(`⏱️  Frecuencia de monitoreo cambiada a ${seconds} segundos`);
  }

  // Verificar salud del servicio
  async healthCheck() {
    try {
      const stats = this.getStats();
      const activePods = await Pod.countDocuments({ 
        status: { $in: ['running', 'creating'] } 
      });
      
      return {
        status: 'healthy',
        monitoring: stats,
        activePods,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new PodMonitorService();
