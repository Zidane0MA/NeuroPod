const mongoose = require('mongoose');
const { generateUserHash } = require('../utils/podHelpers');

// Esquemas para los servicios HTTP y TCP
const HttpServiceSchema = new mongoose.Schema({
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['creating', 'ready', 'error', 'stopped'],
    default: 'creating'
  },
  jupyterToken: {
    type: String,
    sparse: true
  },
  kubernetesServiceName: {
    type: String
  },
  kubernetesIngressName: {
    type: String
  }
}, { _id: false });

const TcpServiceSchema = new mongoose.Schema({
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['creating', 'ready', 'error', 'stopped', 'disable'],
    default: 'disable'
  }
}, { _id: false });

// Esquema para estadísticas del pod
const PodStatsSchema = new mongoose.Schema({
  cpuUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  memoryUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  gpuUsage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  uptime: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Esquema para recursos de Kubernetes
const KubernetesResourcesSchema = new mongoose.Schema({
  podName: {
    type: String,
    default: ''
  },
  pvcName: {
    type: String,
    default: ''
  },
  namespace: {
    type: String,
    default: 'default'
  }
}, { _id: false });

const PodSchema = new mongoose.Schema({
  // Identificadores únicos
  podId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('crypto').randomBytes(8).toString('hex')
  },
  podName: {
    type: String,
    required: [true, 'Por favor proporciona un nombre para el pod'],
    trim: true,
    maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userHash: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Configuración de despliegue
  deploymentType: {
    type: String,
    enum: ['template', 'docker'],
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  dockerImage: {
    type: String,
    trim: true
  },
  gpu: {
    type: String,
    required: true
  },
  containerDiskSize: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  volumeDiskSize: {
    type: Number,
    required: true,
    min: 1,
    max: 150
  },
  enableJupyter: {
    type: Boolean,
    default: true
  },
  
  // Estado actual
  status: {
    type: String,
    enum: ['creating', 'running', 'stopped', 'error'],
    default: 'creating'
  },
  
  // Servicios
  httpServices: {
    type: [HttpServiceSchema],
    default: []
  },
  tcpServices: {
    type: [TcpServiceSchema],
    default: []
  },
  
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Kubernetes info
  kubernetesResources: {
    type: KubernetesResourcesSchema,
    default: () => ({
      podName: '',
      pvcName: '',
      namespace: 'default'
    })
  },
  
  // Estadísticas
  stats: {
    type: PodStatsSchema,
    default: () => ({
      cpuUsage: 0,
      memoryUsage: 0,
      gpuUsage: 0,
      uptime: 0,
      lastUpdated: new Date()
    })
  }
});

// Middleware pre-save para generar campos automáticamente
PodSchema.pre('save', function(next) {
  try {
    // Generar userHash si no existe
    if (!this.userHash && this.userId) {
      this.userHash = generateUserHash(this.userId.toString());
    }
    
    // Asegurar que kubernetesResources existe
    if (!this.kubernetesResources) {
      this.kubernetesResources = {
        podName: '',
        pvcName: '',
        namespace: 'default'
      };
    }
    
    // Generar nombres de recursos de Kubernetes si están vacíos
    if (!this.kubernetesResources.podName && this.podName && this.userHash) {
      this.kubernetesResources.podName = `${this.podName}-${this.userHash}`;
    }
    if (!this.kubernetesResources.pvcName && this.userHash) {
      this.kubernetesResources.pvcName = `workspace-${this.userHash}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Método virtual para calcular el tiempo de actividad formateado
PodSchema.virtual('formattedUptime').get(function() {
  if (this.status !== 'running' || this.stats.uptime === 0) return '-';
  
  const hours = Math.floor(this.stats.uptime / 3600);
  const minutes = Math.floor((this.stats.uptime % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
});

// Método virtual para calcular el coste por hora
PodSchema.virtual('costPerHour').get(function() {
  // Precios configurables (estos deberían venir de configuración)
  const gpuPricing = {
    'rtx-4050': parseFloat(process.env.GPU_RTX4050_PRICE) || 0.50,
    'rtx-4080': parseFloat(process.env.GPU_RTX4080_PRICE) || 1.50,
    'rtx-4090': parseFloat(process.env.GPU_RTX4090_PRICE) || 2.50
  };
  
  const containerDiskPrice = (parseFloat(process.env.CONTAINER_DISK_PRICE) || 0.05) * this.containerDiskSize;
  const volumeDiskPrice = (parseFloat(process.env.VOLUME_DISK_PRICE) || 0.10) * this.volumeDiskSize;
  const gpuPrice = gpuPricing[this.gpu] || 0.3;
  
  return gpuPrice + containerDiskPrice + volumeDiskPrice;
});

// Método para generar subdominio único y seguro
PodSchema.methods.generateSecureSubdomain = function(port) {
  const safePodName = this.podName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const safePort = port.toString();
  return `${safePodName}-${this.userHash}-${safePort}`;
};

// Método para actualizar estadísticas
PodSchema.methods.updateStats = function(newStats) {
  if (!this.stats) {
    this.stats = {
      cpuUsage: 0,
      memoryUsage: 0,
      gpuUsage: 0,
      uptime: 0,
      lastUpdated: new Date()
    };
  }
  
  this.stats = {
    ...this.stats,
    ...newStats,
    lastUpdated: new Date()
  };
  
  if (this.status === 'running') {
    this.lastActive = new Date();
  }
};

// Método para obtener información de conexiones
PodSchema.methods.getConnectionInfo = function() {
  return {
    podId: this.podId,
    podName: this.podName,
    status: this.status,
    httpServices: this.httpServices.map(service => ({
      port: service.port,
      serviceName: service.serviceName,
      url: service.jupyterToken && service.port === 8888 
        ? `${service.url}?token=${service.jupyterToken}` 
        : service.url,
      isCustom: service.isCustom,
      status: service.status
    })),
    tcpServices: this.tcpServices.map(service => ({
      port: service.port,
      serviceName: service.serviceName,
      url: service.url,
      isCustom: service.isCustom,
      status: service.status
    }))
  };
};

// Virtual para ID (compatibilidad)
PodSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Asegurar que los campos virtuales se serialicen
PodSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Índices para mejorar rendimiento
PodSchema.index({ userId: 1, createdAt: -1 });
PodSchema.index({ podId: 1 }, { unique: true });
PodSchema.index({ status: 1 });
PodSchema.index({ userHash: 1 });
PodSchema.index({ 'kubernetesResources.podName': 1 });

module.exports = mongoose.model('Pod', PodSchema);
