const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth.routes');
const statusRoutes = require('./routes/status.routes');
const podRoutes = require('./routes/pod.routes');
const templateRoutes = require('./routes/template.routes');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Middleware para el análisis de JSON
app.use(express.json());

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL, // Permitir solicitudes desde el frontend
  credentials: true // Permitir cookies en solicitudes CORS
}));

// Crear una ruta para comprobar la salud del backend (muy simple)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API de NeuroPod funcionando correctamente',
    timestamp: new Date().toISOString() 
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/pods', podRoutes);
app.use('/api/templates', templateRoutes);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error en el servidor' });
});

module.exports = app;