const crypto = require('crypto');

/**
 * Genera un hash único para el usuario basado en su ID
 * @param {string} userId - ID del usuario
 * @returns {string} - Hash del usuario
 */
function generateUserHash(userId) {
  return crypto.createHash('md5').update(userId.toString()).digest('hex').substring(0, 8);
}

/**
 * Genera un subdominio seguro y único para un pod
 * @param {string} podName - Nombre del pod
 * @param {string} userId - ID del usuario
 * @param {number} port - Puerto del servicio
 * @returns {string} - Subdominio único
 */
function generateSecureSubdomain(podName, userId, port) {
  const userHash = generateUserHash(userId);
  const safePodName = podName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 10);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  
  const domainSuffix = process.env.DOMAIN_SUFFIX || 'neuropod.online';
  
  return `${safePodName}-${userHash}-${port}-${randomSuffix}.${domainSuffix}`;
}

/**
 * Valida un nombre de pod
 * @param {string} name - Nombre del pod
 * @returns {boolean} - True si es válido
 */
function validatePodName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 3 || name.length > 50) return false;
  
  // Solo letras, números, guiones y guiones bajos
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;
  return validNameRegex.test(name);
}

/**
 * Valida una lista de puertos
 * @param {string} ports - String de puertos separados por comas
 * @returns {Object} - { valid: boolean, ports: number[], errors: string[] }
 */
function validatePorts(ports) {
  const errors = [];
  const validPorts = [];
  
  if (!ports || typeof ports !== 'string') {
    return { valid: false, ports: [], errors: ['Puertos son requeridos'] };
  }
  
  const portsArray = ports.split(',').map(p => p.trim());
  
  for (const portStr of portsArray) {
    const port = parseInt(portStr);
    
    if (isNaN(port)) {
      errors.push(`Puerto inválido: ${portStr}`);
      continue;
    }
    
    if (port < 1 || port > 65535) {
      errors.push(`Puerto fuera de rango: ${port}`);
      continue;
    }
    
    if (port < 1024 && ![22, 80, 3000, 5173, 443].includes(port)) {
      errors.push(`Puerto privilegiado no permitido: ${port}`);
      continue;
    }
    
    if (validPorts.includes(port)) {
      errors.push(`Puerto duplicado: ${port}`);
      continue;
    }
    
    validPorts.push(port);
  }
  
  return {
    valid: errors.length === 0,
    ports: validPorts,
    errors
  };
}

/**
 * Calcula el costo estimado de un pod (DEPRECATED)
 * @param {Object} config - Configuración del pod
 * @returns {number} - Costo en euros
 * @deprecated Usar Pricing.calculateCost() en su lugar
 */
function calculateEstimatedCost(config) {
  // Valores por defecto para compatibilidad
  const defaultGpuPrices = {
    'rtx-4050': 2.50,
    'rtx-4080': 4.99,
    'rtx-4090': 8.99
  };
  
  const defaultContainerDiskPrice = 0.05;
  const defaultVolumeDiskPrice = 0.10;
  
  const gpuCost = defaultGpuPrices[config.gpu] || 2.50;
  const containerCost = (config.containerDiskSize || 0) * defaultContainerDiskPrice;
  const volumeCost = (config.volumeDiskSize || 0) * defaultVolumeDiskPrice;
  
  return gpuCost + containerCost + volumeCost;
}

/**
 * Calcula el costo estimado usando el nuevo sistema de precios
 * @param {Object} config - Configuración del pod
 * @returns {Promise<Object>} - Objeto con desglose de costos
 */
async function calculateEstimatedCostAsync(config) {
  try {
    const Pricing = require('../models/Pricing.model');
    const pricing = await Pricing.getCurrentPricing();
    return pricing.calculateCost(config);
  } catch (error) {
    console.warn('Error calculating cost with new system, using fallback:', error.message);
    // Fallback al método anterior
    const total = calculateEstimatedCost(config);
    return {
      gpu: config.gpu ? (total - (config.containerDiskSize || 0) * 0.05 - (config.volumeDiskSize || 0) * 0.10) : 0,
      containerDisk: (config.containerDiskSize || 0) * 0.05,
      volumeDisk: (config.volumeDiskSize || 0) * 0.10,
      total: total
    };
  }
}

/**
 * Formatea tiempo de actividad en formato legible
 * @param {Date} startTime - Tiempo de inicio
 * @returns {string} - Tiempo formateado
 */
function formatUptime(startTime) {
  if (!startTime) return '-';
  
  const now = new Date();
  const diffMs = now - new Date(startTime);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h ${diffMinutes % 60}m`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes % 60}m`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  } else {
    return `${diffSeconds}s`;
  }
}

/**
 * Genera un ID único para pod
 * @returns {string} - ID único
 */
function generatePodId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Sanitiza un nombre para usar en Kubernetes
 * @param {string} name - Nombre original
 * @returns {string} - Nombre sanitizado
 */
function sanitizeKubernamesName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Valida configuración de recursos
 * @param {Object} resources - Configuración de recursos
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateResources(resources) {
  const errors = [];
  
  if (!resources.gpu) {
    errors.push('GPU es requerida');
  } else if (!['rtx-4050', 'rtx-4070', 'rtx-4080', 'rtx-4090'].includes(resources.gpu)) {
    errors.push('GPU no válida');
  }
  
  if (!resources.containerDiskSize || resources.containerDiskSize < 1 || resources.containerDiskSize > 100) {
    errors.push('Tamaño de disco de contenedor debe estar entre 1 y 100 GB');
  }
  
  if (!resources.volumeDiskSize || resources.volumeDiskSize < 1 || resources.volumeDiskSize > 150) {
    errors.push('Tamaño de volumen debe estar entre 1 y 150 GB');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Obtiene el estado legible de un pod
 * @param {string} status - Estado del pod
 * @returns {Object} - { text: string, color: string, icon: string }
 */
function getPodStatusInfo(status) {
  const statusMap = {
    'creating': { text: 'Iniciando', color: 'yellow', icon: '🟡' },
    'running': { text: 'Ejecutando', color: 'green', icon: '🟢' },
    'stopped': { text: 'Detenido', color: 'gray', icon: '🔴' },
    'error': { text: 'Error', color: 'red', icon: '🔴' },
    'stopping': { text: 'Deteniendo', color: 'orange', icon: '🟠' }
  };
  
  return statusMap[status] || { text: 'Desconocido', color: 'gray', icon: '⚪' };
}

/**
 * Genera configuración de red para el pod
 * @param {string} podName - Nombre del pod
 * @param {string} userHash - Hash del usuario
 * @param {Array} ports - Lista de puertos
 * @returns {Object} - Configuración de red
 */
function generateNetworkConfig(podName, userHash, ports) {
  const config = {
    services: [],
    ingresses: []
  };
  
  ports.forEach(port => {
    const serviceName = `${podName}-${userHash}-${port}-service`;
    const ingressName = `${podName}-${userHash}-${port}-ingress`;
    const subdomain = generateSecureSubdomain(podName, userHash, port);
    
    config.services.push({
      name: serviceName,
      port: port,
      targetPort: port
    });
    
    config.ingresses.push({
      name: ingressName,
      hostname: subdomain,
      serviceName: serviceName,
      servicePort: port
    });
  });
  
  return config;
}

module.exports = {
  generateUserHash,
  generateSecureSubdomain,
  validatePodName,
  validatePorts,
  calculateEstimatedCost, // DEPRECATED
  calculateEstimatedCostAsync, // NUEVO
  formatUptime,
  generatePodId,
  sanitizeKubernamesName,
  validateResources,
  getPodStatusInfo,
  generateNetworkConfig
};
