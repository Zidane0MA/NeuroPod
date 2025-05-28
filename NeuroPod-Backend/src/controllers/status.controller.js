const Pod = require('../models/Pod.model');

// Obtener estado del sistema
exports.getSystemStatus = async (req, res) => {
  try {
    // Obtener estadísticas de pods
    const totalPods = await Pod.countDocuments();
    const runningPods = await Pod.countDocuments({ status: 'running' });
    const stoppedPods = await Pod.countDocuments({ status: 'stopped' });
    const creatingPods = await Pod.countDocuments({ status: 'creating' });
    
    // En una implementación real, aquí obtendrías el estado real del sistema
    const status = {
      system: {
        status: 'online',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: 'connected',
        name: process.env.MONGODB_URI ? 'plataforma' : 'local'
      },
      pods: {
        total: totalPods,
        running: runningPods,
        stopped: stoppedPods,
        creating: creatingPods
      },
      kubernetes: {
        status: 'connected', // En implementación real, verificar conexión K8s
        namespace: process.env.NAMESPACE || 'default'
      }
    };
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error al obtener estado del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado del sistema'
    });
  }
};

// Obtener configuración de precios
exports.getPricing = async (req, res) => {
  try {
    const pricing = {
      gpus: {
        'rtx-4050': {
          name: 'RTX 4050',
          price: parseFloat(process.env.GPU_RTX4050_PRICE) || 0.50,
          available: true,
          specs: {
            memory: '6GB GDDR6',
            cores: '2560 CUDA',
            performance: 'Entry Level'
          }
        },
        'rtx-4070': {
          name: 'RTX 4070',
          price: parseFloat(process.env.GPU_RTX4070_PRICE) || 1.00,
          available: true,
          specs: {
            memory: '12GB GDDR6X',
            cores: '5888 CUDA',
            performance: 'High Performance'
          }
        },
        'rtx-4080': {
          name: 'RTX 4080',
          price: parseFloat(process.env.GPU_RTX4080_PRICE) || 1.50,
          available: false, // Puedes controlar disponibilidad desde variables de entorno
          specs: {
            memory: '16GB GDDR6X',
            cores: '9728 CUDA',
            performance: 'Ultra Performance'
          }
        },
        'rtx-4090': {
          name: 'RTX 4090',
          price: parseFloat(process.env.GPU_RTX4090_PRICE) || 2.50,
          available: false,
          specs: {
            memory: '24GB GDDR6X',
            cores: '16384 CUDA',
            performance: 'Flagship'
          }
        }
      },
      storage: {
        containerDisk: {
          name: 'Container Storage',
          price: parseFloat(process.env.CONTAINER_DISK_PRICE) || 0.05,
          unit: '€/GB/hour',
          description: 'Almacenamiento temporal del contenedor'
        },
        volumeDisk: {
          name: 'Persistent Volume',
          price: parseFloat(process.env.VOLUME_DISK_PRICE) || 0.10,
          unit: '€/GB/hour',
          description: 'Almacenamiento persistente en /workspace'
        }
      },
      limits: {
        containerDiskMax: 50, // GB
        volumeDiskMax: 150,   // GB
        portsMax: 10
      }
    };
    
    res.status(200).json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener precios'
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
    
    const gpuPrices = {
      'rtx-4050': parseFloat(process.env.GPU_RTX4050_PRICE) || 0.50,
      'rtx-4070': parseFloat(process.env.GPU_RTX4070_PRICE) || 1.00,
      'rtx-4080': parseFloat(process.env.GPU_RTX4080_PRICE) || 1.50,
      'rtx-4090': parseFloat(process.env.GPU_RTX4090_PRICE) || 2.50
    };
    
    const containerDiskPrice = parseFloat(process.env.CONTAINER_DISK_PRICE) || 0.05;
    const volumeDiskPrice = parseFloat(process.env.VOLUME_DISK_PRICE) || 0.10;
    
    const gpuCost = (gpuPrices[gpu] || 0) * hours;
    const containerCost = containerDiskSize * containerDiskPrice * hours;
    const volumeCost = volumeDiskSize * volumeDiskPrice * hours;
    const totalCost = gpuCost + containerCost + volumeCost;
    
    const breakdown = {
      gpu: {
        name: gpu.toUpperCase(),
        cost: gpuCost,
        hours: hours
      },
      containerDisk: {
        size: containerDiskSize,
        cost: containerCost,
        hours: hours
      },
      volumeDisk: {
        size: volumeDiskSize,
        cost: volumeCost,
        hours: hours
      },
      total: totalCost,
      currency: 'EUR'
    };
    
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
