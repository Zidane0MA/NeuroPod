const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Middleware para proteger rutas - Verifica que el usuario esté autenticado
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Verificar si hay token y está en el encabezado de Authorization
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Formato: "Bearer token..."
      token = req.headers.authorization.split(' ')[1];
    } 
    // También se puede verificar si está en cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Verificar que el token exista
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar usuario
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No se encontró un usuario con este ID'
        });
      }

      // Añadir usuario al request
      req.user = user;
      next();
    } catch (error) {
      // Si el token no es válido o expiró
      return res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Middleware para verificar roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.role} no está autorizado para acceder a esta ruta`
      });
    }
    next();
  };
};