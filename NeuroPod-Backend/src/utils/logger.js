const Log = require('../models/Log.model');

/**
 * Registra una acción en la base de datos
 * @param {string} userId - ID del usuario
 * @param {string} action - Tipo de acción
 * @param {object} details - Detalles adicionales
 */
const logAction = async (userId, action, details = {}) => {
  try {
    const log = await Log.create({
      userId,
      action,
      details
    });
    console.log(`Log creado: ${action} para usuario ${userId}`);
    return log;
  } catch (error) {
    console.error(`Error al crear log: ${error.message}`);
    // No lanzamos error para evitar que falle la operación principal
  }
};

module.exports = {
  logAction
};