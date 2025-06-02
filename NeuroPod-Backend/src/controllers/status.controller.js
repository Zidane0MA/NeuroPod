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