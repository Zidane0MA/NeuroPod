const mongoose = require('mongoose');

const PortMappingSchema = new mongoose.Schema({
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
  }
}, { _id: false });

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  dockerImage: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  httpPorts: {
    type: [PortMappingSchema],
    required: true,
    validate: {
      validator: function(ports) {
        return ports && ports.length > 0;
      },
      message: 'Al menos un puerto HTTP es requerido'
    }
  },
  tcpPorts: {
    type: [PortMappingSchema],
    default: []
  },
  containerDiskSize: {
    type: Number,
    required: true,
    min: 5,
    max: 100,
    default: 10
  },
  volumeDiskSize: {
    type: Number,
    required: true,
    min: 10,
    max: 150,
    default: 20
  },
  volumePath: {
    type: String,
    required: true,
    default: '/workspace',
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt en cada save
TemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validación personalizada para evitar puertos duplicados dentro del mismo template
TemplateSchema.pre('save', function(next) {
  const allPorts = [...this.httpPorts, ...this.tcpPorts];
  const portNumbers = allPorts.map(p => p.port);
  const uniquePorts = new Set(portNumbers);
  
  if (portNumbers.length !== uniquePorts.size) {
    const error = new Error('No se pueden tener puertos duplicados en el mismo template');
    return next(error);
  }
  next();
});

// Método para obtener todos los puertos como string (para compatibilidad)
TemplateSchema.methods.getPortsAsString = function() {
  return this.httpPorts.map(p => p.port).join(', ');
};

// Método para obtener información resumida
TemplateSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    dockerImage: this.dockerImage,
    totalPorts: this.httpPorts.length + this.tcpPorts.length,
    totalStorage: this.containerDiskSize + this.volumeDiskSize,
    createdAt: this.createdAt
  };
};

// Virtual para convertir _id a id
TemplateSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialised.
TemplateSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Template', TemplateSchema);
