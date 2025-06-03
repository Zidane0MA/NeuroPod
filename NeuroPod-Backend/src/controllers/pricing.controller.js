const Pricing = require('../models/Pricing.model');
const { logAction } = require('../utils/logger');

// Obtener configuración actual de precios
exports.getPricing = async (req, res) => {
  try {
    const pricing = await Pricing.getCurrentPricing();
    
    // Formatear la respuesta para el frontend
    const response = {
      gpus: {},
      storage: pricing.storage,
      limits: pricing.limits,
      freeTier: pricing.freeTier
    };
    
    // Formatear información de GPUs
    Object.keys(pricing.gpus).forEach(gpuId => {
      const gpu = pricing.gpus[gpuId];
      response.gpus[gpuId] = {
        name: gpuId.toUpperCase().replace('-', ' '),
        price: gpu.price,
        available: gpu.available,
        specs: gpu.specs
      };
    });
    
    await logAction(req.user._id, 'GET_PRICING');
    
    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error al obtener precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de precios'
    });
  }
};

// Obtener configuración pública de precios (sin autenticación)
exports.getPublicPricing = async (req, res) => {
  try {
    const pricing = await Pricing.getCurrentPricing();
    
    // Formatear la respuesta para la página pública
    const response = {
      gpus: {},
      storage: {
        containerDisk: {
          price: pricing.storage.containerDisk.price,
          unit: pricing.storage.containerDisk.unit,
          description: pricing.storage.containerDisk.description
        },
        volumeDisk: {
          price: pricing.storage.volumeDisk.price,
          unit: pricing.storage.volumeDisk.unit,
          description: pricing.storage.volumeDisk.description
        }
      },
      limits: {
        containerDiskMax: pricing.limits.containerDiskMax,
        volumeDiskMax: pricing.limits.volumeDiskMax
      },
      freeTier: {
        enabled: pricing.freeTier.enabled,
        initialBalance: pricing.freeTier.initialBalance
      }
    };
    
    // Formatear información de GPUs (solo mostrar las disponibles para página pública)
    Object.keys(pricing.gpus).forEach(gpuId => {
      const gpu = pricing.gpus[gpuId];
      response.gpus[gpuId] = {
        name: gpuId.toUpperCase().replace('-', ' '),
        price: gpu.price,
        available: gpu.available,
        specs: {
          memory: gpu.specs.memory,
          cores: gpu.specs.cores,
          performance: gpu.specs.performance
        }
      };
    });
    
    // No hacer log para endpoint público (sin usuario)
    
    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error al obtener precios públicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener precios'
    });
  }
};

// Actualizar configuración de precios (solo administradores)
exports.updatePricing = async (req, res) => {
  try {
    const { gpus, storage, limits, freeTier } = req.body;
    
    // Validaciones básicas
    if (gpus) {
      Object.keys(gpus).forEach(gpuId => {
        if (gpus[gpuId].price && gpus[gpuId].price < 0) {
          throw new Error(`Precio de ${gpuId} no puede ser negativo`);
        }
      });
    }
    
    if (storage) {
      if (storage.containerDisk?.price && storage.containerDisk.price < 0) {
        throw new Error('Precio de container disk no puede ser negativo');
      }
      if (storage.volumeDisk?.price && storage.volumeDisk.price < 0) {
        throw new Error('Precio de volume disk no puede ser negativo');
      }
    }
    
    // Actualizar precios
    const updatedPricing = await Pricing.updatePricing({
      gpus,
      storage,
      limits,
      freeTier
    }, req.user._id);
    
    await logAction(req.user._id, 'UPDATE_PRICING', { 
      changes: { gpus, storage, limits, freeTier }
    });
    
    res.status(200).json({
      success: true,
      message: 'Precios actualizados correctamente',
      data: updatedPricing
    });
  } catch (error) {
    console.error('Error al actualizar precios:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar precios'
    });
  }
};

// Calcular costo estimado de una configuración
exports.calculateCost = async (req, res) => {
  try {
    const { gpu, containerDiskSize, volumeDiskSize, hours = 1 } = req.body;
    
    if (!gpu || !containerDiskSize || !volumeDiskSize) {
      return res.status(400).json({
        success: false,
        message: 'GPU, containerDiskSize y volumeDiskSize son requeridos'
      });
    }
    
    const pricing = await Pricing.getCurrentPricing();
    
    // Verificar que la GPU existe
    if (!pricing.gpus[gpu]) {
      return res.status(400).json({
        success: false,
        message: `GPU ${gpu} no encontrada en la configuración`
      });
    }
    
    // Calcular costos
    const costs = pricing.calculateCost({
      gpu,
      containerDiskSize,
      volumeDiskSize
    });
    
    // Multiplicar por horas
    const breakdown = {
      gpu: {
        name: gpu.toUpperCase().replace('-', ' '),
        hourlyRate: costs.gpu,
        cost: costs.gpu * hours,
        hours: hours
      },
      containerDisk: {
        size: containerDiskSize,
        hourlyRate: costs.containerDisk,
        cost: costs.containerDisk * hours,
        hours: hours
      },
      volumeDisk: {
        size: volumeDiskSize,
        hourlyRate: costs.volumeDisk,
        cost: costs.volumeDisk * hours,
        hours: hours
      },
      total: costs.total * hours,
      totalHourly: costs.total,
      currency: 'EUR'
    };
    
    await logAction(req.user._id, 'CALCULATE_COST', { 
      config: { gpu, containerDiskSize, volumeDiskSize, hours },
      cost: breakdown.total
    });
    
    res.status(200).json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error al calcular costo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular costo'
    });
  }
};

// Obtener información de GPU específica
exports.getGpuInfo = async (req, res) => {
  try {
    const { gpuId } = req.params;
    const pricing = await Pricing.getCurrentPricing();
    
    const gpuInfo = pricing.getGpuInfo(gpuId);
    
    if (!gpuInfo) {
      return res.status(404).json({
        success: false,
        message: `GPU ${gpuId} no encontrada`
      });
    }
    
    res.status(200).json({
      success: true,
      data: gpuInfo
    });
  } catch (error) {
    console.error('Error al obtener información de GPU:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de GPU'
    });
  }
};

// Obtener lista de GPUs disponibles
exports.getAvailableGpus = async (req, res) => {
  try {
    const pricing = await Pricing.getCurrentPricing();
    
    const availableGpus = pricing.availableGpus.map(gpuId => 
      pricing.getGpuInfo(gpuId)
    );
    
    res.status(200).json({
      success: true,
      data: availableGpus
    });
  } catch (error) {
    console.error('Error al obtener GPUs disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener GPUs disponibles'
    });
  }
};

// Resetear precios a valores por defecto
exports.resetPricing = async (req, res) => {
  try {
    // Eliminar configuración actual
    await Pricing.findByIdAndDelete('507f1f77bcf86cd799439011');
    
    // Crear nueva configuración con valores por defecto
    const newPricing = await Pricing.getCurrentPricing();
    
    await logAction(req.user._id, 'RESET_PRICING');
    
    res.status(200).json({
      success: true,
      message: 'Precios restablecidos a valores por defecto',
      data: newPricing
    });
  } catch (error) {
    console.error('Error al restablecer precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer precios'
    });
  }
};
