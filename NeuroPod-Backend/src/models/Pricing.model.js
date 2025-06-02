const mongoose = require('mongoose');

const PricingSchema = new mongoose.Schema({
  // Configuración única del sistema (solo habrá un documento)
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') // ID fijo
  },
  
  // Precios de GPUs
  gpus: {
    'rtx-4050': {
      price: { type: Number, required: true, default: 2.50 },
      available: { type: Boolean, default: true },
      specs: {
        memory: { type: String, default: '6GB GDDR6' },
        cores: { type: Number, default: 2560 },
        performance: { type: String, default: 'Entry Level' }
      }
    },
    'rtx-4080': {
      price: { type: Number, required: true, default: 4.99 },
      available: { type: Boolean, default: false },
      specs: {
        memory: { type: String, default: '16GB GDDR6X' },
        cores: { type: Number, default: 9728 },
        performance: { type: String, default: 'Ultra Performance' }
      }
    },
    'rtx-4090': {
      price: { type: Number, required: true, default: 8.99 },
      available: { type: Boolean, default: false },
      specs: {
        memory: { type: String, default: '24GB GDDR6X' },
        cores: { type: Number, default: 16384 },
        performance: { type: String, default: 'Flagship' }
      }
    }
  },
  
  // Precios de almacenamiento
  storage: {
    containerDisk: {
      price: { type: Number, required: true, default: 0.05 }, // €/GB/hora
      unit: { type: String, default: '€/GB/hora' },
      description: { type: String, default: 'Almacenamiento temporal del contenedor' }
    },
    volumeDisk: {
      price: { type: Number, required: true, default: 0.10 }, // €/GB/hora
      unit: { type: String, default: '€/GB/hora' },
      description: { type: String, default: 'Almacenamiento persistente en /workspace' }
    }
  },
  
  // Límites del sistema
  limits: {
    containerDiskMax: { type: Number, default: 100 }, // GB
    volumeDiskMax: { type: Number, default: 150 },   // GB
    portsMax: { type: Number, default: 10 }
  },
  
  // Configuración del free tier
  freeTier: {
    enabled: { type: Boolean, default: true },
    initialBalance: { type: Number, default: 10.00 } // € que reciben los nuevos usuarios
  },
  
  // Metadatos
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
});

// Middleware para actualizar updatedAt
PricingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método estático para obtener configuración de precios
PricingSchema.statics.getCurrentPricing = async function() {
  let pricing = await this.findById('507f1f77bcf86cd799439011');
  
  // Si no existe, crear configuración por defecto
  if (!pricing) {
    pricing = new this({
      _id: '507f1f77bcf86cd799439011'
    });
    await pricing.save();
  }
  
  return pricing;
};

// Método estático para actualizar precios
PricingSchema.statics.updatePricing = async function(updates, updatedBy) {
  const pricing = await this.getCurrentPricing();
  
  // Actualizar campos específicos
  if (updates.gpus) {
    Object.keys(updates.gpus).forEach(gpu => {
      if (pricing.gpus[gpu]) {
        Object.assign(pricing.gpus[gpu], updates.gpus[gpu]);
        pricing.markModified(`gpus.${gpu}`);
      }
    });
  }
  
  if (updates.storage) {
    Object.assign(pricing.storage, updates.storage);
    pricing.markModified('storage');
  }
  
  if (updates.limits) {
    Object.assign(pricing.limits, updates.limits);
    pricing.markModified('limits');
  }
  
  if (updates.freeTier) {
    Object.assign(pricing.freeTier, updates.freeTier);
    pricing.markModified('freeTier');
  }
  
  pricing.updatedBy = updatedBy;
  await pricing.save();
  
  return pricing;
};

// Método para calcular costo de configuración
PricingSchema.methods.calculateCost = function(config) {
  const gpuPrice = this.gpus[config.gpu]?.price || 0;
  const containerCost = (config.containerDiskSize || 0) * this.storage.containerDisk.price;
  const volumeCost = (config.volumeDiskSize || 0) * this.storage.volumeDisk.price;
  
  return {
    gpu: gpuPrice,
    containerDisk: containerCost,
    volumeDisk: volumeCost,
    total: gpuPrice + containerCost + volumeCost
  };
};

// Método para obtener información de GPU específica
PricingSchema.methods.getGpuInfo = function(gpuId) {
  const gpu = this.gpus[gpuId];
  if (!gpu) return null;
  
  return {
    id: gpuId,
    name: gpuId.toUpperCase().replace('-', ' '),
    price: gpu.price,
    available: gpu.available,
    specs: gpu.specs
  };
};

// Virtual para obtener lista de GPUs disponibles
PricingSchema.virtual('availableGpus').get(function() {
  return Object.keys(this.gpus).filter(gpu => this.gpus[gpu].available);
});

// Ensure virtual fields are serialised
PricingSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Pricing', PricingSchema);
