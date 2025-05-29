const Pod = require('../models/Pod.model');
const User = require('../models/User.model');
const Template = require('../models/Template.model');
const kubernetesService = require('../services/kubernetes.service');
const podMonitorService = require('../services/podMonitor.service');
const { logAction } = require('../utils/logger');

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
    
    await logAction(req.user._id, 'GET_POD_CONNECTIONS', { podId });
    
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
      await stopPodResources(pod);
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
    const estimatedCost = calculatePodCost(body);
    if (podOwner.balance < estimatedCost) {
      const error = new Error(`Saldo insuficiente. Requerido: €${estimatedCost}, Disponible: €${podOwner.balance}`);
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

async function deductBalanceIfClient(podOwner, body) {
  if (podOwner.role === 'client') {
    const cost = calculatePodCost(body);
    await User.findByIdAndUpdate(podOwner._id, { 
      $inc: { balance: -cost } 
    });
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

async function stopPodResources(pod) {
  const services = pod.httpServices.map(service => ({
    serviceName: service.kubernetesServiceName,
    ingressName: service.kubernetesIngressName
  }));
  
  try {
    await kubernetesService.deletePodResources(pod.podName, pod.userHash, services);
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
      await kubernetesService.createPodWithServices({
        name: pod.podName,
        userId: podOwner._id.toString(),
        dockerImage: pod.dockerImage,
        ports: body.ports,
        containerDiskSize: body.containerDiskSize,
        volumeDiskSize: body.volumeDiskSize,
        gpu: body.gpu,
        enableJupyter: body.enableJupyter
      });
      
      pod.status = 'creating';
      await pod.save();
      
      // Capturar token de Jupyter si es necesario
      if (body.enableJupyter) {
        scheduleJupyterTokenCapture(pod);
      }
      
    } catch (err) {
      console.error('Error creando recursos Kubernetes:', err);
      pod.status = 'error';
      await pod.save();
    }
  });
}

function recreateKubernetesResourcesAsync(pod) {
  setImmediate(async () => {
    try {
      await kubernetesService.createPodWithServices({
        name: pod.podName,
        userId: pod.userId.toString(),
        dockerImage: pod.dockerImage,
        ports: pod.httpServices.map(s => s.port).join(','),
        containerDiskSize: pod.containerDiskSize,
        volumeDiskSize: pod.volumeDiskSize,
        gpu: pod.gpu,
        enableJupyter: pod.enableJupyter
      });
      
      await updatePodStatus(pod, 'creating');
      
    } catch (err) {
      console.error('Error iniciando pod:', err);
      pod.status = 'error';
      await pod.save();
    }
  });
}

function deleteKubernetesResourcesAsync(pod) {
  setImmediate(async () => {
    try {
      await stopPodResources(pod);
      await updatePodStatus(pod, 'stopped');
    } catch (err) {
      console.error('Error deteniendo pod:', err);
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

function calculatePodCost(podConfig) {
  // Obtener precios desde variables de entorno o usar valores por defecto
  const gpuCosts = {
    'rtx-4050': parseFloat(process.env.GPU_RTX4050_PRICE) || 0.5,
    'rtx-4080': parseFloat(process.env.GPU_RTX4080_PRICE) || 1.5,
    'rtx-4090': parseFloat(process.env.GPU_RTX4090_PRICE) || 2.5
  };
  
  const baseCost = gpuCosts[podConfig.gpu] || 0.3;
  const storageCost = (podConfig.containerDiskSize + podConfig.volumeDiskSize) * 0.01;
  
  return baseCost + storageCost;
}