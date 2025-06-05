const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const setupSocket = require('./socket');
const podMonitorService = require('./services/podMonitor.service');

// Cargar variables de entorno
dotenv.config();

// Puerto
const PORT = process.env.PORT || 3000;

// Variable para evitar múltiples cierres
let isShuttingDown = false;

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conexión a MongoDB establecida');
    
    // Crear servidor HTTP
    const server = http.createServer(app);
    
    // Configurar WebSockets
    const io = setupSocket(server);
    
    // Hacer que io esté disponible en toda la aplicación
    app.set('io', io);
    
    // Inicializar el servicio de monitoreo de pods
    console.log('🔧 Inicializando servicio de monitoreo de pods...');
    podMonitorService.init(io);
    
    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`🌍 Modo: ${process.env.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📡 WebSocket disponible en ws://localhost:${PORT}`);
        console.log(`🔍 API Status: http://localhost:${PORT}/api/status`);
      } else {
        console.log(`📡 WebSocket disponible en wss://api.neuropod.online`);
        console.log(`🔍 API Status: https://api.neuropod.online/api/status`);
      }
      
      console.log('💡 Presiona Ctrl+C para detener el servidor');
    });
    
    // Función de cierre gracioso
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) {
        console.log('⚠️  Ya se está cerrando el servidor...');
        return;
      }
      
      isShuttingDown = true;
      console.log(`\n🛑 Señal ${signal} recibida. Cerrando servidor...`);
      
      // Timeout para forzar cierre si tarda mucho
      const forceExitTimer = setTimeout(() => {
        console.error('❌ Timeout alcanzado. Forzando cierre...');
        process.exit(1);
      }, 15000); // 15 segundos máximo
      
      try {
        // 1. Detener el servicio de monitoreo primero
        console.log('🔧 Deteniendo servicio de monitoreo...');
        if (podMonitorService && typeof podMonitorService.stop === 'function') {
          podMonitorService.stop();
        }
        
        // 2. Cerrar conexiones WebSocket
        console.log('📡 Cerrando conexiones WebSocket...');
        if (io && typeof io.gracefulClose === 'function') {
          io.gracefulClose();
        } else if (io) {
          io.close();
        }
        
        // 3. Cerrar servidor HTTP
        console.log('🌐 Cerrando servidor HTTP...');
        await new Promise((resolve) => {
          server.close((err) => {
            if (err) {
              console.error('Error cerrando servidor HTTP:', err);
            } else {
              console.log('✅ Servidor HTTP cerrado');
            }
            resolve();
          });
        });
        
        // 4. Cerrar conexión a MongoDB
        console.log('🗄️  Cerrando conexión a MongoDB...');
        await mongoose.connection.close();
        console.log('✅ Conexión a MongoDB cerrada');
        
        // Limpiar el timeout
        clearTimeout(forceExitTimer);
        
        console.log('👋 NeuroPod Backend detenido correctamente');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error durante el cierre:', error);
        clearTimeout(forceExitTimer);
        process.exit(1);
      }
    };
    
    // Manejar señales de terminación - SOLO UNA VEZ
    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Manejar errores no capturados - SOLO UNA VEZ
    process.once('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.once('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1);
  });
