const Pod = require('../models/Pod.model');
const User = require('../models/User.model');
const Template = require('../models/Template.model');
const kubernetesService = require('../services/kubernetes.service');
const podMonitorService = require('../services/podMonitor.service');
const { logAction } = require('../utils/logger');

// Obtener todos los pods del usuario actual
exports.getPods = async (req, res) => {
  try {
    let pods;
    
    // Si hay parámetro userEmail y el usuario es admin, buscar pods por email
    if (req.query.userEmail && req.user.role === 'admin') {
      const targetUser = await User.findOne({ email: req.query.userEmail });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
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
    const formattedPods = pods.map(pod => {
      return {
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
      };
    });
    
    // Registrar acción
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
    console.error('Error al obtener pods:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pods',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener información de conexiones de un pod
exports.getPodConnections = async (req, res) => {
  try {
    const { podId } = req.params;
    
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este pod'
      });
    }
    
    // Forzar actualización del estado del pod
    await podMonitorService.monitorPod(podId);
    
    // Obtener pod actualizado
    const updatedPod = await Pod.findOne({ podId });
    
    // Obtener información de conexiones
    const connectionInfo = updatedPod.getConnectionInfo();
    
    // Registrar acción
    await logAction(req.user._id, 'GET_POD_CONNECTIONS', { podId });
    
    res.status(200).json({
      success: true,
      data: connectionInfo
    });
  } catch (error) {
    console.error('Error al obtener conexiones del pod:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conexiones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crear un nuevo pod
exports.createPod = async (req, res) => {
  try {
    const {
      name,
      deploymentType,
      template,
      dockerImage,
      gpu,
      containerDiskSize,
      volumeDiskSize,
      ports,
      enableJupyter,
      assignToUser
    } = req.body;
    
    // Validaciones básicas
    const errors = await validatePodPayload(req.body, req.user);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    // Determinar el propietario del pod
    let podOwner;
    if (req.body.assignToUser && req.user.role === "admin") {
      podOwner = await User.findOne({ email: req.body.assignToUser });
      if (!podOwner) {
        return res.status(404).json({
          success: false,
          message: 'Usuario destino no encontrado'
        });
      }
    } else {
      podOwner = req.user;
    }
    
    // Validar saldo (solo para clientes)
    if (podOwner.role === "client") {
      const estimatedCost = calculatePodCost(req.body);
      if (podOwner.balance < estimatedCost) {
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Requerido: €${estimatedCost}, Disponible: €${podOwner.balance}`
        });
      }
    }
    
    // Procesar configuración del pod
    const { finalDockerImage, httpServices, tcpServices } = await processPodConfiguration(req.body);
    
    // Crear el pod en la base de datos
    const pod = await Pod.create({
      podName: name,
      userId: podOwner._id,
      createdBy: req.user._id,
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
    
    // Crear recursos en Kubernetes (asíncrono)
    setImmediate(async () => {
      try {
        const kubernetesResult = await kubernetesService.createPodWithServices({
          name: pod.podName,
          userId: podOwner._id.toString(),
          dockerImage: finalDockerImage,
          ports: ports,
          containerDiskSize,
          volumeDiskSize,
          gpu,
          enableJupyter
        });
        
        // Actualizar el pod con información de Kubernetes
        pod.status = 'creating';
        await pod.save();
        
        // Capturar token de Jupyter si es necesario (después de un delay)
        if (enableJupyter) {
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
        
      } catch (err) {
        console.error('Error creando recursos Kubernetes:', err);
        pod.status = 'error';
        await pod.save();
      }
    });
    
    // Descontar saldo si es cliente
    if (podOwner.role === 'client') {
      const cost = calculatePodCost(req.body);
      await User.findByIdAndUpdate(podOwner._id, { 
        $inc: { balance: -cost } 
      });
    }
    
    // Registrar acción
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
    console.error('Error al crear pod:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al crear el pod',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Iniciar un pod
exports.startPod = async (req, res) => {
  try {
    const { podId } = req.params;
    
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para iniciar este pod'
      });
    }
    
    if (pod.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'El pod ya está en ejecución'
      });
    }
    
    // Recrear el pod en Kubernetes
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
        
        pod.status = 'creating';
        pod.httpServices.forEach(service => {
          service.status = 'creating';
        });
        await pod.save();
        
      } catch (err) {
        console.error('Error iniciando pod:', err);
        pod.status = 'error';
        await pod.save();
      }
    });
    
    // Actualizar estado inmediatamente en la BD
    pod.status = 'creating';
    pod.httpServices.forEach(service => {
      service.status = 'creating';
    });
    await pod.save();
    
    // Registrar acción
    await logAction(req.user._id, 'START_POD', { podId });
    
    res.status(200).json({
      success: true,
      message: 'Pod iniciándose',
      data: {
        podId: pod.podId,
        status: 'creating'
      }
    });
    
  } catch (error) {
    console.error('Error al iniciar pod:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al iniciar el pod',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Detener un pod
exports.stopPod = async (req, res) => {
  try {
    const { podId } = req.params;
    
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para detener este pod'
      });
    }
    
    if (pod.status === 'stopped') {
      return res.status(400).json({
        success: false,
        message: 'El pod ya está detenido'
      });
    }
    
    // Eliminar recursos de Kubernetes
    setImmediate(async () => {
      try {
        const services = pod.httpServices.map(service => ({
          serviceName: service.kubernetesServiceName,
          ingressName: service.kubernetesIngressName
        }));
        
        await kubernetesService.deletePodResources(pod.podName, pod.userHash, services);
        
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
        
      } catch (err) {
        console.error('Error deteniendo pod:', err);
      }
    });
    
    // Actualizar estado inmediatamente en la BD
    pod.status = 'stopped';
    pod.httpServices.forEach(service => {
      service.status = 'stopped';
    });
    await pod.save();
    
    // Registrar acción
    await logAction(req.user._id, 'STOP_POD', { podId });
    
    res.status(200).json({
      success: true,
      message: 'Pod detenido correctamente',
      data: {
        podId: pod.podId,
        status: 'stopped'
      }
    });
    
  } catch (error) {
    console.error('Error al detener pod:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al detener el pod',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar un pod
exports.deletePod = async (req, res) => {
  try {
    const { podId } = req.params;
    
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este pod'
      });
    }
    
    // Detener el pod primero si está en ejecución
    if (pod.status === 'running' || pod.status === 'creating') {
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
    
    // Eliminar el pod de la base de datos
    await Pod.findByIdAndDelete(pod._id);
    
    // Registrar acción
    await logAction(req.user._id, 'DELETE_POD', { podId });
    
    res.status(200).json({
      success: true,
      message: 'Pod eliminado correctamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar pod:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al eliminar el pod',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener logs de un pod
exports.getPodLogs = async (req, res) => {
  try {
    const { podId } = req.params;
    
    const pod = await Pod.findOne({ podId });
    
    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Pod no encontrado'
      });
    }
    
    // Verificar acceso
    if (req.user.role !== 'admin' && pod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a los logs de este pod'
      });
    }
    
    // Obtener logs desde Kubernetes
    let logs = 'No hay logs disponibles.';
    
    if (pod.status === 'stopped') {
      logs = 'El pod está detenido. No hay logs disponibles.';
    } else {
      try {
        logs = await kubernetesService.getPodLogs(pod.podName, pod.userHash);
      } catch (err) {
        logs = 'No se pudieron obtener los logs. El pod podría estar iniciándose.';
      }
    }
    
    // Registrar acción
    await logAction(req.user._id, 'GET_POD_LOGS', { podId });
    
    res.status(200).json({
      success: true,
      data: {
        logs: logs
      }
    });
    
  } catch (error) {
    console.error('Error al obtener logs del pod:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al obtener logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Funciones auxiliares

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
    
    // Asignar nombres de servicios basados en el template
    httpServices = assignServiceNames(portsArray, template.httpPorts, payload.enableJupyter);
    
  } else {
    // Imagen Docker personalizada
    finalDockerImage = payload.dockerImage;
    
    // Asignar nombres genéricos
    httpServices = assignServiceNamesDocker(portsArray, payload.enableJupyter);
  }
  
  // Servicios TCP (decorativos)
  tcpServices = [
    {
      port: 22,
      serviceName: 'SSH',
      url: `tcp://placeholder.neuropod.online:22`,
      isCustom: false,
      status: 'disable'
    }
  ];
  
  return { finalDockerImage, httpServices, tcpServices };
}

function assignServiceNames(userPorts, templatePorts, enableJupyter) {
  const result = [];
  
  userPorts.forEach((port, index) => {
    // 1. Buscar match exacto en template
    const templateMatch = templatePorts.find(tp => tp.port === port);
    if (templateMatch) {
      result.push({
        port: port,
        serviceName: templateMatch.serviceName,
        isCustom: false,
        status: 'creating',
        url: `https://placeholder-${port}.neuropod.online`,
        kubernetesServiceName: '',
        kubernetesIngressName: ''
      });
      return;
    }
    
    // 2. Si es puerto 8888 y Jupyter está habilitado
    if (port === 8888 && enableJupyter) {
      result.push({
        port: 8888,
        serviceName: "Jupyter Lab",
        isCustom: false,
        status: 'creating',
        url: `https://placeholder-8888.neuropod.online`,
        kubernetesServiceName: '',
        kubernetesIngressName: ''
      });
      return;
    }
    
    // 3. Puerto personalizado agregado por usuario
    result.push({
      port: port,
      serviceName: `Servicio ${index + 1}`,
      isCustom: true,
      status: 'creating',
      url: `https://placeholder-${port}.neuropod.online`,
      kubernetesServiceName: '',
      kubernetesIngressName: ''
    });
  });
  
  return result;
}

function assignServiceNamesDocker(userPorts, enableJupyter) {
  const result = [];
  
  userPorts.forEach((port, index) => {
    // Si es puerto 8888 y Jupyter está habilitado
    if (port === 8888 && enableJupyter) {
      result.push({
        port: 8888,
        serviceName: "Jupyter Lab",
        isCustom: false,
        status: 'creating',
        url: `https://placeholder-8888.neuropod.online`,
        kubernetesServiceName: '',
        kubernetesIngressName: ''
      });
      return;
    }
    
    // Para todos los demás puertos
    result.push({
      port: port,
      serviceName: `Servicio ${index + 1}`,
      isCustom: true,
      status: 'creating',
      url: `https://placeholder-${port}.neuropod.online`,
      kubernetesServiceName: '',
      kubernetesIngressName: ''
    });
  });
  
  return result;
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
