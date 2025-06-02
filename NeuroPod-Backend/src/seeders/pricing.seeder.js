const Pricing = require('../models/Pricing.model');

const seedPricing = async () => {
  try {
    console.log('🔧 Inicializando configuración de precios...');
    
    // Verificar si ya existe configuración
    const existingPricing = await Pricing.findById('507f1f77bcf86cd799439011');
    
    if (existingPricing) {
      console.log('✅ Configuración de precios ya existe');
      return existingPricing;
    }
    
    // Crear configuración por defecto
    const defaultPricing = new Pricing({
      _id: '507f1f77bcf86cd799439011',
      gpus: {
        'rtx-4050': {
          price: 2.50,
          available: true,
          specs: {
            memory: '6GB GDDR6',
            cores: 2560,
            performance: 'Entry Level'
          }
        },
        'rtx-4080': {
          price: 4.99,
          available: false,
          specs: {
            memory: '16GB GDDR6X',
            cores: 9728,
            performance: 'Ultra Performance'
          }
        },
        'rtx-4090': {
          price: 8.99,
          available: false,
          specs: {
            memory: '24GB GDDR6X',
            cores: 16384,
            performance: 'Flagship'
          }
        }
      },
      storage: {
        containerDisk: {
          price: 0.05,
          unit: '€/GB/hora',
          description: 'Almacenamiento temporal del contenedor'
        },
        volumeDisk: {
          price: 0.10,
          unit: '€/GB/hora',
          description: 'Almacenamiento persistente en /workspace'
        }
      },
      limits: {
        containerDiskMax: 100,
        volumeDiskMax: 150,
        portsMax: 10
      },
      freeTier: {
        enabled: true,
        initialBalance: 10.00
      }
    });
    
    await defaultPricing.save();
    console.log('✅ Configuración de precios por defecto creada');
    
    return defaultPricing;
  } catch (error) {
    console.error('❌ Error al inicializar precios:', error);
    throw error;
  }
};

module.exports = { seedPricing };
