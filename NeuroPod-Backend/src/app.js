const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth.routes');
const statusRoutes = require('./routes/status.routes');
const podRoutes = require('./routes/pod.routes');
const templateRoutes = require('./routes/template.routes');
const pricingRoutes = require('./routes/pricing.routes');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Middleware para el análisis de JSON
app.use(express.json());

// 🔥 CONFIGURACIÓN CORS ACTUALIZADA - Múltiples orígenes
const allowedOrigins = [
     process.env.FRONTEND_URL,
     process.env.FRONTEND_URL_HTTPS,
     'http://localhost:3000', // Para testing directo, si lo necesitas como variable, agrégala también al .env
   ].filter(Boolean); // Elimina valores undefined si alguna variable no está definida

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true // Permitir cookies en solicitudes CORS
}));

// 📊 Logging de requests para debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} desde ${req.headers.origin || 'sin origin'}`);
  next();
});

// Crear una ruta para comprobar la salud del backend (muy simple)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API de NeuroPod funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/pods', podRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/pricing', pricingRoutes);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error en el servidor' });
});

module.exports = app;