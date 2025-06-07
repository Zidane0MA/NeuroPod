const Pod = require('../models/Pod.model');
const User = require('../models/User.model');
const Template = require('../models/Template.model');
const kubernetesService = require('../services/kubernetes.service');
const podMonitorService = require('../services/podMonitor.service');
const { logAction } = require('../utils/logger');

// =========================================
// FUNCIÓN HELPER PARA OBTENER IO
// =========================================
function getSocketIO(req) {
  return req.app.get('io');
}

// =========================================
// CONTROLADORES PRINCIPALES
// =========================================

// Obtener todos los pods del usuario actual
exports.getPods = async (req, res) => {
  try {
    const { pods, formattedPods } = await getPodsForUser(req);
    
    await logAction(req.user._id, 'GET_PODS', { 
      userEmail: req.query.userEmail || 'self',
      count: pods.length 
    });
    
    res.status(200).json({
      success: true,
      count: pods.length,
      data: formattedPods
    });
  } catch (error) {
    handleControllerError(res, error, 'Error al obtener pods');
  }
};

// Obtener información de conexiones de un pod
exports.getPodConnections = async (req, res) => {
  try {
    const { podId } = req.params;
    const pod = await findPodWithAccess(podId, req.user);
    
    // Forzar actualización del estado del pod
    await podMonitorService.monitorPod(podId);
    
    // Obtener pod actualizado y información de conexiones
    const updatedPod = await Pod.findOne({ podId });
    const connectionInfo = updatedPod.getConnectionInfo();
    
    res.status(200).json({
      success: true,
      data: connectionInfo
    });
  } catch (error) {
    handleControllerError(res, error, 'Error al obtener conexiones');
  }
};

// Crear un nuevo pod
exports.createPod = async (req, res) => {
  try {
    // Validaciones y preparación
    const errors = await validatePodPayload(req.body, req.user);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }
    
    const podOwner = await determinePodOwner(req.body, req.user);
    await validateUserBalance(podOwner, req.body);
    
    // Procesar configuración y crear pod
    const { finalDockerImage, httpServices, tcpServices } = await processPodConfiguration(req.body);
    const pod = await createPodRecord(req.body, podOwner, req.user, finalDockerImage, httpServices, tcpServices);
    
    // 🔥 AGREGAR: Notificar creación de pod por WebSocket
    const io = getSocketIO(req);
    if (io && io.notifyPodCreated) {
      io.notifyPodCreated(podOwner._id.toString(), {
        podId: pod.podId,
        podName: pod.podName,
        status: pod.status,
        gpu: pod.gpu,
        containerDiskSize: pod.containerDiskSize,
        volumeDiskSize: pod.volumeDiskSize,
        createdBy: req.user.email
      });
    }
    
    // Crear recursos en Kubernetes (asíncrono)
    createKubernetesResourcesAsync(pod, podOwner, req.body);
    
    // Descontar saldo si es necesario
    await deductBalanceIfClient(podOwner, req.body);
    
    await logAction(req.user._id, 'CREATE_POD', { 
      podId: pod.podId,
      targetUser: podOwner._id !== req.user._id ? podOwner._id : undefined
    });
    
    res.status(201).json({
      success: true,
      data: {
        podId: pod.podId,
        podName: pod.podName,
        status: pod.status,
        message: 'Pod creándose. Por favor espere unos minutos.'
      }
    });
    
  } catch (error) {
    handleControllerError(res, error, 'Error interno al crear el pod');
  }
};

// Iniciar un pod
exports.startPod = async (req, res) => {
  try {
    const { podId } = req.params;
    const pod = await findPodWithAccess(podId, req.user);
    
    validatePodState(pod, 'running', 'El pod ya está en ejecución');
    
    // Recrear el pod en Kubernetes (asíncrono)
    recreateKubernetesResourcesAsync(pod);
    
    // Actualizar estado inmediatamente
    await updatePodStatus(pod, 'creating');
    
    // 🔥 AGREGAR: Notificar actualización por WebSocket
    const io = getSocketIO(req);
    if (io && io.sendPodUpdate) {
      io.sendPodUpdate(pod.podId, {
        status: 'creating',
        stats: pod.stats,
        httpServices: pod.httpServices,
        tcpServices: pod.tcpServices,
        message: 'Pod iniciándose...'
      });
    }
    
    await logAction(req.user._id, 'START_POD', { podId });
    
    res.status(200).json({
      success: true,
      message: 'Pod iniciándose',
      data: { podId: pod.podId, status: 'creating' }
    });
    
  } catch (error) {
    handleControllerError(res, error, 'Error interno al iniciar el pod');
  }
};

// Detener un pod
exports.stopPod = async (req, res) => {
  try {
    const { podId } = req.params;
    const pod = await findPodWithAccess(podId, req.user);
    
    validatePodState(pod, 'stopped', 'El pod ya está detenido');
    
    // Eliminar recursos de Kubernetes (asíncrono)
    deleteKubernetesResourcesAsync(pod);
    
    // Actualizar estado inmediatamente
    await updatePodStatus(pod, 'stopped');
    
    // 🔥 AGREGAR: Notificar actualización por WebSocket
    const io = getSocketIO(req);
    if (io && io.sendPodUpdate) {
      io.sendPodUpdate(pod.podId, {
        status: 'stopped',
        stats: pod.stats,
        httpServices: pod.httpServices,
        tcpServices: pod.tcpServices,
        message: 'Pod detenido correctamente'
      });
    }
    
    await logAction(req.user._id, 'STOP_POD', { podId });
    
    res.status(200).json({
      success: true,
      message: 'Pod detenido correctamente',
      data: { podId: pod.podId, status: 'stopped' }
    });
    
  } catch (error) {
    handleControllerError(res, error, 'Error interno al detener el pod');
  }
};

// Eliminar un pod
exports.deletePod = async (req, res) => {
  try {
    const { podId } = req.params;
    const pod = await findPodWithAccess(podId, req.user);
    
    // Detener el pod primero si está en ejecución
    if (['running', 'creating'].includes(pod.status)) {
      await stopPodResources(pod, true); // true = eliminar PVC
    }
    
    // 🔥 AGREGAR: Notificar eliminación por WebSocket ANTES de eliminar
    const io = getSocketIO(req);
    if (io && io.notifyPodDeleted) {
      io.notifyPodDeleted(pod.userId.toString(), pod.podId);
    }
    
    // Eliminar el pod de la base de datos
    await Pod.findByIdAndDelete(pod._id);
    
    await logAction(req.user._id, 'DELETE_POD', { podId });
    
    res.status(200).json({
      success: true,
      message: 'Pod eliminado correctamente'
    });
    
  } catch (error) {
    handleControllerError(res, error, 'Error interno al eliminar el pod');
  }
};

// Obtener logs de un pod
exports.getPodLogs = async (req, res) => {
  try {
    const { podId } = req.params;
    const pod = await findPodWithAccess(podId, req.user);
    
    const logs = await getPodLogsContent(pod);
    
    await logAction(req.user._id, 'GET_POD_LOGS', { podId });
    
    res.status(200).json({
      success: true,
      data: { logs }
    });
    
  } catch (error) {
    handleControllerError(res, error, 'Error interno al obtener logs');
  }
};

// =========================================
// FUNCIONES AUXILIARES PRINCIPALES
// =========================================

async function findPodWithAccess(podId, user) {
  const pod = await Pod.findOne({ podId });
  
  if (!pod) {
    const error = new Error('Pod no encontrado');
    error.statusCode = 404;
    throw error;
  }
  
  // Verificar acceso
  if (user.role !== 'admin' && pod.userId.toString() !== user._id.toString()) {
    const error = new Error('No tienes permiso para acceder a este pod');
    error.statusCode = 403;
    throw error;
  }
  
  return pod;
}

function validatePodState(pod, invalidState, message) {
  if (pod.status === invalidState) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
}

async function updatePodStatus(pod, status) {
  pod.status = status;
  pod.httpServices.forEach(service => {
    service.status = status;
  });
  if (status === 'stopped') {
    pod.tcpServices.forEach(service => {
      if (service.status !== 'disable') {
        service.status = 'stopped';
      }
    });
  }
  await pod.save();
}

function handleControllerError(res, error, defaultMessage) {
  console.error(`${defaultMessage}:`, error);
  
  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : defaultMessage;
  
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// =========================================
// FUNCIONES DE LÓGICA DE NEGOCIO
// =========================================

async function getPodsForUser(req) {
  let pods;
  
  // Si hay parámetro userEmail y el usuario es admin, buscar pods por email
  if (req.query.userEmail && req.user.role === 'admin') {
    const targetUser = await User.findOne({ email: req.query.userEmail });
    if (!targetUser) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    
    pods = await Pod.find({ userId: targetUser._id })
      .populate('userId', 'email name')
      .populate('templateId', 'name')
      .sort({ createdAt: -1 });
      
    // Agregar email del usuario a cada pod
    pods = pods.map(pod => {
      const podObj = pod.toObject();
      podObj.userEmail = req.query.userEmail;
      return podObj;
    });
    
  } else if (req.user.role === 'admin') {
    // Admin sin parámetro userEmail: obtener solo sus pods
    pods = await Pod.find({ userId: req.user._id })
      .populate('userId', 'email name')
      .populate('templateId', 'name')
      .sort({ createdAt: -1 });
      
  } else {
    // Usuario regular: obtener solo sus pods
    pods = await Pod.find({ userId: req.user._id })
      .populate('templateId', 'name')
      .sort({ createdAt: -1 });
  }
  
  // Formatear los pods para la respuesta
  const formattedPods = pods.map(pod => ({
    podId: pod.podId,
    podName: pod.podName,
    status: pod.status,
    gpu: pod.gpu,
    containerDiskSize: pod.containerDiskSize,
    volumeDiskSize: pod.volumeDiskSize,
    createdAt: pod.createdAt,
    lastActive: pod.lastActive,
    stats: pod.stats,
    userEmail: pod.userEmail || (pod.userId && typeof pod.userId === 'object' ? pod.userId.email : undefined)
  }));
  
  return { pods, formattedPods };
}

async function determinePodOwner(body, currentUser) {
  if (body.assignToUser && currentUser.role === "admin") {
    const podOwner = await User.findOne({ email: body.assignToUser });
    if (!podOwner) {
      const error = new Error('Usuario destino no encontrado');
      error.statusCode = 404;
      throw error;
    }
    return podOwner;
  }
  return currentUser;
}

async function validateUserBalance(podOwner, body) {
  if (podOwner.role === "client") {
    const estimatedCost = await calculatePodCostAsync(body);
    if (podOwner.balance < estimatedCost) {
      const error = new Error(`Saldo insuficiente. Requerido: €${estimatedCost.toFixed(2)}, Disponible: €${podOwner.balance.toFixed(2)}`);
      error.statusCode = 400;
      throw error;
    }
  }
}

async function createPodRecord(body, podOwner, currentUser, finalDockerImage, httpServices, tcpServices) {
  const { name, deploymentType, template, gpu, containerDiskSize, volumeDiskSize, enableJupyter } = body;
  
  return await Pod.create({
    podName: name,
    userId: podOwner._id,
    createdBy: currentUser._id,
    deploymentType,
    templateId: deploymentType === 'template' ? template : undefined,
    dockerImage: finalDockerImage,
    gpu,
    containerDiskSize,
    volumeDiskSize,
    enableJupyter,
    httpServices,
    tcpServices,
    kubernetesResources: {
      podName: '', // Se generará en el pre-save
      pvcName: '', // Se generará en el pre-save
      namespace: 'default'
    }
  });
}

// =========================================
// NUEVA FUNCIÓN: Notificar actualizaciones de saldo
// =========================================

// Función para notificar saldo bajo
function checkAndNotifyLowBalance(userId, currentBalance, threshold = 5.0) {
  if (currentBalance <= threshold) {
    const app = require('../app');
    const io = app.get('io');
    if (io && io.sendLowBalanceAlert) {
      io.sendLowBalanceAlert(userId.toString(), {
        currentBalance,
        threshold,
        message: `Tu saldo es bajo: €${currentBalance.toFixed(2)}. Considera recargar tu cuenta.`
      });
    }
  }
}

async function deductBalanceIfClient(podOwner, body) {
  if (podOwner.role === 'client') {
    const cost = await calculatePodCostAsync(body);
    const updatedUser = await User.findByIdAndUpdate(
      podOwner._id, 
      { $inc: { balance: -cost } },
      { new: true }
    );
    
    // 🔥 AGREGAR: Verificar y notificar saldo bajo
    checkAndNotifyLowBalance(podOwner._id, updatedUser.balance);
  }
}

async function getPodLogsContent(pod) {
  if (pod.status === 'stopped') {
    return 'El pod está detenido. No hay logs disponibles.';
  }
  
  try {
    return await kubernetesService.getPodLogs(pod.podName, pod.userHash);
  } catch (err) {
    return 'No se pudieron obtener los logs. El pod podría estar iniciándose.';
  }
}

async function stopPodResources(pod, deletePVC = false) {
  // Generar nombres de servicios usando la misma lógica que en kubernetes.service.js
  const { generateUserHash } = require('../utils/podHelpers');
  const userHash = generateUserHash(pod.userId.toString());
  const sanitizedPodName = pod.podName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  const services = pod.httpServices.map(service => {
    const serviceName = `${sanitizedPodName}-${userHash}-${service.port}-service`;
    const ingressName = `${sanitizedPodName}-${userHash}-${service.port}-ingress`;
    return {
      serviceName,
      ingressName
    };
  });
  
  try {
    await kubernetesService.deletePodResources(
      pod.podName, 
      userHash, 
      services,
      deletePVC ? `pvc-${sanitizedPodName}-${userHash}` : null
    );
  } catch (err) {
    console.warn('Warning al eliminar recursos K8s:', err.message);
  }
}

// =========================================
// FUNCIONES ASÍNCRONAS DE KUBERNETES
// =========================================

function createKubernetesResourcesAsync(pod, podOwner, body) {
  setImmediate(async () => {
    try {
      const kubernetesResult = await kubernetesService.createPodWithServices({
        name: pod.podName,
        userId: podOwner._id.toString(),
        dockerImage: pod.dockerImage,
        ports: body.ports,
        containerDiskSize: body.containerDiskSize,
        volumeDiskSize: body.volumeDiskSize,
        gpu: body.gpu,
        enableJupyter: body.enableJupyter
      });
      
      // Actualizar el pod con la información real de Kubernetes
      if (kubernetesResult && kubernetesResult.services) {
        // Actualizar cada servicio HTTP con la información real
        kubernetesResult.services.forEach(k8sService => {
          const httpService = pod.httpServices.find(service => service.port === k8sService.port);
          if (httpService) {
            httpService.url = k8sService.url;
            httpService.kubernetesServiceName = k8sService.serviceName;
            httpService.kubernetesIngressName = k8sService.ingressName;
            console.log(`🔗 URL actualizada en creación: ${httpService.serviceName} -> ${k8sService.url}`);
          }
        });
        
        // Actualizar información de Kubernetes en el pod
        pod.kubernetesResources.podName = kubernetesResult.podName;
        pod.kubernetesResources.pvcName = kubernetesResult.pvcName;
        pod.userHash = kubernetesResult.userHash;
      }
      
      pod.status = 'creating';
      await pod.save();
      
      // 🔥 AGREGAR: Notificar cambio de estado
      const app = require('../app'); // Obtener app para acceder a io
      const io = app.get('io');
      if (io && io.sendPodUpdate) {
        io.sendPodUpdate(pod.podId, {
          status: 'creating',
          httpServices: pod.httpServices,
          tcpServices: pod.tcpServices,
          message: 'Recursos de Kubernetes creados, pod inicializándose...'
        });
      }
      
      console.log(`✅ Pod ${pod.podName} creado exitosamente con URLs reales`);
      
      // Capturar token de Jupyter si es necesario
      if (body.enableJupyter) {
        scheduleJupyterTokenCapture(pod);
      }
      
    } catch (err) {
      console.error('Error creando recursos Kubernetes:', err);
      pod.status = 'error';
      await pod.save();
      
      // 🔥 AGREGAR: Notificar error
      const app = require('../app');
      const io = app.get('io');
      if (io && io.sendPodUpdate) {
        io.sendPodUpdate(pod.podId, {
          status: 'error',
          message: 'Error al crear recursos de Kubernetes'
        });
      }
    }
  });
}

function recreateKubernetesResourcesAsync(pod) {
  setImmediate(async () => {
    try {
      const kubernetesResult = await kubernetesService.createPodWithServices({
        name: pod.podName,
        userId: pod.userId.toString(),
        dockerImage: pod.dockerImage,
        ports: pod.httpServices.map(s => s.port).join(','),
        containerDiskSize: pod.containerDiskSize,
        volumeDiskSize: pod.volumeDiskSize,
        gpu: pod.gpu,
        enableJupyter: pod.enableJupyter
      });
      
      // Actualizar URLs si hay información de servicios
      if (kubernetesResult && kubernetesResult.services) {
        kubernetesResult.services.forEach(k8sService => {
          const httpService = pod.httpServices.find(service => service.port === k8sService.port);
          if (httpService) {
            httpService.url = k8sService.url;
            httpService.kubernetesServiceName = k8sService.serviceName;
            httpService.kubernetesIngressName = k8sService.ingressName;
            console.log(`🔗 URL actualizada en reinicio: ${httpService.serviceName} -> ${k8sService.url}`);
          }
        });
        
        // Actualizar userHash si es necesario
        if (kubernetesResult.userHash && !pod.userHash) {
          pod.userHash = kubernetesResult.userHash;
        }
      }
      
      await updatePodStatus(pod, 'creating');
      
      // 🔥 AGREGAR: Notificar actualización
      const app = require('../app');
      const io = app.get('io');
      if (io && io.sendPodUpdate) {
        io.sendPodUpdate(pod.podId, {
          status: 'creating',
          message: 'Pod reiniciándose...'
        });
      }
      
    } catch (err) {
      console.error('Error iniciando pod:', err);
      pod.status = 'error';
      await pod.save();
      
      // 🔥 AGREGAR: Notificar error
      const app = require('../app');
      const io = app.get('io');
      if (io && io.sendPodUpdate) {
        io.sendPodUpdate(pod.podId, {
          status: 'error',
          message: 'Error al iniciar pod'
        });
      }
    }
  });
}

function deleteKubernetesResourcesAsync(pod) {
  setImmediate(async () => {
    try {
      await stopPodResources(pod, false); // false = conservar PVC
      await updatePodStatus(pod, 'stopped');
      
      // 🔥 AGREGAR: Notificar detención
      const app = require('../app');
      const io = app.get('io');
      if (io && io.sendPodUpdate) {
        io.sendPodUpdate(pod.podId, {
          status: 'stopped',
          message: 'Pod detenido correctamente'
        });
      }
      
    } catch (err) {
      console.error('Error deteniendo pod:', err);
      
      // 🔥 AGREGAR: Notificar error
      const app = require('../app');
      const io = app.get('io');
      if (io && io.sendPodUpdate) {
        io.sendPodUpdate(pod.podId, {
          status: 'error',
          message: 'Error al detener pod'
        });
      }
    }
  });
}

function scheduleJupyterTokenCapture(pod) {
  setTimeout(async () => {
    try {
      const token = await kubernetesService.captureJupyterToken(pod.podName, pod.userHash);
      if (token) {
        const jupyterService = pod.httpServices.find(s => s.port === 8888);
        if (jupyterService) {
          jupyterService.jupyterToken = token;
          await pod.save();
        }
      }
    } catch (err) {
      console.error('Error capturando token Jupyter:', err);
    }
  }, 15000); // Esperar 15 segundos
}

// =========================================
// FUNCIONES DE VALIDACIÓN Y CONFIGURACIÓN
// =========================================

async function validatePodPayload(payload, currentUser) {
  const errors = [];

  // Validaciones básicas
  if (!payload.name) errors.push("Nombre es requerido");
  if (!payload.gpu) errors.push("GPU es requerida");
  if (!payload.deploymentType) errors.push("Tipo de despliegue requerido");
  if (!payload.ports) errors.push("Puertos son requeridos");
  
  if (payload.containerDiskSize < 1 || payload.containerDiskSize > 100) {
    errors.push("Tamaño de disco de contenedor debe estar entre 1 y 100 GB");
  }
  
  if (payload.volumeDiskSize < 1 || payload.volumeDiskSize > 150) {
    errors.push("Tamaño de volumen debe estar entre 1 y 150 GB");
  }

  // Validación según tipo de despliegue
  if (payload.deploymentType === "template" && !payload.template) {
    errors.push("Template es requerido");
  }
  if (payload.deploymentType === "docker" && !payload.dockerImage) {
    errors.push("Imagen Docker es requerida");
  }

  // Validación de asignación de usuario
  if (payload.assignToUser) {
    if (currentUser.role !== "admin") {
      errors.push("Solo administradores pueden asignar pods a otros usuarios");
    }
    
    const targetUser = await User.findOne({ email: payload.assignToUser });
    if (!targetUser) {
      errors.push(`Usuario ${payload.assignToUser} no encontrado`);
    }
    
    if (targetUser && targetUser.role !== "client") {
      errors.push("Solo se puede asignar pods a usuarios con rol 'client'");
    }
  }

  return errors;
}

async function processPodConfiguration(payload) {
  let finalDockerImage;
  let httpServices = [];
  let tcpServices = [];
  
  // Procesar puertos
  const portsArray = payload.ports.split(',').map(p => parseInt(p.trim()));
  
  if (payload.deploymentType === 'template') {
    const template = await Template.findById(payload.template);
    if (!template) {
      throw new Error('Template no encontrado');
    }
    
    finalDockerImage = template.dockerImage;
    httpServices = assignServiceNames(portsArray, template.httpPorts, payload.enableJupyter);
    
  } else {
    // Imagen Docker personalizada
    finalDockerImage = payload.dockerImage;
    httpServices = assignServiceNamesDocker(portsArray, payload.enableJupyter);
  }
  
  // Servicios TCP (decorativos)
  tcpServices = [{
    port: 22,
    serviceName: 'SSH',
    url: `tcp://placeholder.neuropod.online:22`,
    isCustom: false,
    status: 'disable'
  }];
  
  return { finalDockerImage, httpServices, tcpServices };
}

function assignServiceNames(userPorts, templatePorts, enableJupyter) {
  return userPorts.map((port, index) => {
    // 1. Buscar match exacto en template
    const templateMatch = templatePorts.find(tp => tp.port === port);
    if (templateMatch) {
      return createServiceObject(port, templateMatch.serviceName, false);
    }
    
    // 2. Si es puerto 8888 y Jupyter está habilitado
    if (port === 8888 && enableJupyter) {
      return createServiceObject(8888, "Jupyter Lab", false);
    }
    
    // 3. Puerto personalizado agregado por usuario
    return createServiceObject(port, `Servicio ${index + 1}`, true);
  });
}

function assignServiceNamesDocker(userPorts, enableJupyter) {
  return userPorts.map((port, index) => {
    // Si es puerto 8888 y Jupyter está habilitado
    if (port === 8888 && enableJupyter) {
      return createServiceObject(8888, "Jupyter Lab", false);
    }
    
    // Para todos los demás puertos
    return createServiceObject(port, `Servicio ${index + 1}`, true);
  });
}

function createServiceObject(port, serviceName, isCustom) {
  return {
    port,
    serviceName,
    isCustom,
    status: 'creating',
    url: `https://placeholder-${port}.neuropod.online`,
    kubernetesServiceName: '',
    kubernetesIngressName: ''
  };
}

// Función para calcular costo de pod (DEPRECATED)
function calculatePodCost(podConfig) {
  // Valores por defecto para compatibilidad
  const defaultGpuCosts = {
    'rtx-4050': 2.50,
    'rtx-4080': 4.99,
    'rtx-4090': 8.99
  };
  
  const baseCost = defaultGpuCosts[podConfig.gpu] || 2.50;
  const containerCost = podConfig.containerDiskSize * 0.05;
  const volumeCost = podConfig.volumeDiskSize * 0.10;
  
  return baseCost + containerCost + volumeCost;
}

// Función asíncrona para calcular costo usando el nuevo sistema
async function calculatePodCostAsync(podConfig) {
  try {
    const Pricing = require('../models/Pricing.model');
    const pricing = await Pricing.getCurrentPricing();
    const costs = pricing.calculateCost(podConfig);
    return costs.total;
  } catch (error) {
    console.warn('Error calculating pod cost with new system, using fallback:', error.message);
    return calculatePodCost(podConfig);
  }
}