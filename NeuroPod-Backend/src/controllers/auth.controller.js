const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');
const User = require('../models/User.model');
const Session = require('../models/Session.model');
const { logAction } = require('../utils/logger');

// Cliente OAuth2 de Google
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Login simulado para desarrollo
exports.mockLogin = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }
    
    console.log(`Intento de login simulado para: ${email}`);
    
    // En el mockLogin siempre debemos verificar el acceso en modo producción
    // ya que no pasa por la verificación de Google
    if (process.env.NODE_ENV === 'production') {
      // Verificar si el correo está en la lista de permitidos
      const allowedEmails = process.env.ALLOWED_EMAILS ? 
        process.env.ALLOWED_EMAILS.split(',').map(email => email.trim()) : 
        [];
      
      // Determinar qué emails tienen rol de administrador
      // Por defecto, solo lolerodiez@gmail.com es admin
      const adminEmails = process.env.ADMIN_EMAILS ? 
        process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
        [];
      
      // Verificar si es admin
      const isAdmin = adminEmails.includes(email);
      
      // Verificar si el email está permitido (admins siempre permitidos + emails en lista permitida)
      const isEmailAllowed = isAdmin || allowedEmails.includes(email);
      
      if (!isEmailAllowed) {
        console.log(`Acceso denegado para: ${email} - Email no autorizado`);
        return res.status(403).json({
          success: false,
          message: 'No estás autorizado para acceder a esta aplicación',
          details: 'En modo producción, mockLogin solo permite acceso a emails específicamente autorizados.'
        });
      }
    }
    
    // Buscar usuario existente o crear uno nuevo
    let user = await User.findOne({ email });
    
    // Determinar qué emails tienen rol de administrador
    const adminEmails = process.env.ADMIN_EMAILS ? 
      process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
      [];
    
    // Verificar si es admin
    const isAdmin = adminEmails.includes(email);
    
    if (!user) {
      console.log(`Creando usuario simulado: ${email} (${isAdmin ? 'admin' : 'client'})`);
      
      user = await User.create({
        email,
        name: isAdmin ? 'Administrador' : email.split('@')[0],
        role: isAdmin ? 'admin' : 'client',
        balance: 10.0, // El middleware pre-save ajustará esto a Infinity para admins
        plan: 'free'
      });
      
      // Registrar log de nuevo usuario
      await logAction(user._id, 'SIGNUP', { provider: 'mock' });
    } else {
      console.log(`Usuario encontrado: ${user.email} (${user.role})`);
      
      // Asegurarnos que los roles estén correctamente asignados
      if (isAdmin && user.role !== 'admin') {
        // Si debería ser admin pero no lo es, actualizar
        console.log(`Actualizando rol a admin para: ${email}`);
        user.role = 'admin';
        await user.save();
      } else if (!isAdmin && user.role === 'admin') {
        // Si no debería ser admin pero lo es, quitar privilegios
        console.log(`Quitando rol admin a: ${email}`);
        user.role = 'client';
        await user.save();
      }
    }
    
    // Generar token JWT
    const jwtToken = generateToken(user);
    
    // Guardar sesión
    await Session.create({
      userId: user._id,
      token: jwtToken
    });
    
    // Registrar log de login
    await logAction(user._id, 'LOGIN', { provider: 'mock' });
    
    console.log(`Login simulado exitoso para: ${user.email} (${user.role})`);
    
    // Preparar datos del usuario para el frontend
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      balance: user.role === 'admin' ? Infinity : user.balance,
      plan: user.plan,
      registrationDate: user.createdAt.toLocaleDateString(),
      activePods: 0, // Estos valores se deberían obtener dinámicamente
      totalPods: 0,  // desde la base de datos en una aplicación real
      status: 'online'
    };
    
    // Enviar respuesta
    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userData
    });
    
  } catch (error) {
    console.error('Error en mockLogin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión simulada',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ruta de callback para Google OAuth
exports.googleCallback = (req, res) => {
  // Esta ruta se llama desde el flujo de OAuth de Google
  console.log('Callback de Google recibido:', req.query);
  
  // Redirigir al frontend con el token en fragmento de URL
  const code = req.query.code || '';
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?code=${code}`);
};

// Login con Google
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }
    
    console.log('Procesando token de autenticación');
    
    let payload = null;
    
    // Pasos para verificar/decodificar el token
    try {
      // 1. Intentar verificar como ID token
      try {
        console.log('Intentando verificar como ID token de Google');
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        
        payload = ticket.getPayload();
        console.log('Token verificado como ID token');
      } 
      // 2. Si falla, intentar verificar como token de acceso
      catch (idTokenError) {
        console.log('No es un ID token válido:', idTokenError.message);
        
        try {
          console.log('Intentando verificar como token de acceso');
          const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
          const tokenInfo = await response.json();
          
          if (!tokenInfo.error) {
            console.log('Es un token de acceso válido');
            
            // Obtener información del usuario
            const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
            payload = await userInfoResponse.json();
            console.log('Información de usuario obtenida');
          } else {
            throw new Error(`Token inválido: ${tokenInfo.error}`);
          }
        } 
        // 3. Si todavía falla, intentar decodificar como JWT manualmente
        catch (accessTokenError) {
          console.log('No es un token de acceso válido:', accessTokenError.message);
          
          try {
            console.log('Intentando decodificar manualmente');
            const base64Url = token.split('.')[1];
            
            if (!base64Url) {
              throw new Error('No es un JWT válido');
            }
            
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decodedBase64 = Buffer.from(base64, 'base64').toString('binary');
            
            const jsonPayload = decodeURIComponent(
              Array.from(decodedBase64).map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join('')
            );
            
            payload = JSON.parse(jsonPayload);
            console.log('Token decodificado manualmente');
          } catch (decodeError) {
            console.error('Error al decodificar token:', decodeError.message);
            throw new Error('No se pudo verificar ni decodificar el token');
          }
        }
      }
    } catch (error) {
      console.error('Error en verificación de token:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token de Google inválido o expirado',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (!payload) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo extraer información del token'
      });
    }
    
    console.log('Payload extraído:', payload);
    
    // Crear objeto con información del usuario
    const googleUser = {
      googleId: payload.sub || payload.user_id || payload.id,
      email: payload.email,
      name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'Usuario',
      avatar: payload.picture || payload.avatar || payload.image
    };
    
    // Verificar campos mínimos
    if (!googleUser.email) {
      return res.status(400).json({
        success: false,
        message: 'El token no contiene la información necesaria (email)'
      });
    }
    
    console.log('Usuario de Google:', googleUser);
    
    // NUEVO: Verificar acceso
    console.log('NODE_ENV:', process.env.NODE_ENV, 'TRUST_GOOGLE_AUTH:', process.env.TRUST_GOOGLE_AUTH);
    // En modo producción, confiamos en que Google OAuth ya ha verificado que el usuario está autorizado
    // ya que Google solo permite autenticación de usuarios registrados en modo de prueba
    if (process.env.NODE_ENV === 'production' && process.env.TRUST_GOOGLE_AUTH !== 'true') {
      // Si no confiamos exclusivamente en Google Auth, verificamos la lista de correos permitidos
      const allowedEmails = process.env.ALLOWED_EMAILS ? process.env.ALLOWED_EMAILS.split(',') : [];
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
      
      // Verificar si el email está permitido (admins siempre permitidos + emails en lista permitida)
      const isEmailAllowed = adminEmails.includes(googleUser.email) || allowedEmails.includes(googleUser.email);
      
      if (!isEmailAllowed) {
        console.log(`Acceso denegado para: ${googleUser.email} - Email no autorizado`);
        return res.status(403).json({
          success: false,
          message: 'No estás autorizado para acceder a esta aplicación'
        });
      }
    }
    
    // Buscar usuario existente o crear uno nuevo
    let user = await User.findOne({ email: googleUser.email });
    
    // Determinar qué emails tienen rol de administrador
    // Por defecto, solo lolerodiez@gmail.com es admin
    const adminEmails = process.env.ADMIN_EMAILS ? 
      process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
      [];
    
    if (!user) {
      console.log('Creando nuevo usuario:', googleUser.email);
      
      // Determinar si el email actual debe tener rol de admin
      const isAdmin = adminEmails.includes(googleUser.email);
      
      user = await User.create({
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
        role: isAdmin ? 'admin' : 'client',
        balance: 10.0, // Saldo inicial
        plan: 'free'
      });
      
      // Registrar log de nuevo usuario
      await logAction(user._id, 'SIGNUP', { provider: 'google' });
    } else {
      console.log('Usuario encontrado:', user.email);
      
      // Verificar si es admin
      if (adminEmails.includes(user.email) && user.role !== 'admin') {
        console.log(`Actualizando usuario ${user.email} a rol admin`);
        user.role = 'admin';
        await user.save();
      } else if (!adminEmails.includes(user.email) && user.role === 'admin') {
        // Si el usuario tenía rol admin pero ya no está en la lista de admins, quitarle el rol
        console.log(`Quitando rol admin a ${user.email}`);
        user.role = 'client';
        await user.save();
      }
      
      // Actualizar datos del usuario si han cambiado
      if (user.name !== googleUser.name || user.avatar !== googleUser.avatar) {
        user.name = googleUser.name;
        user.avatar = googleUser.avatar;
        await user.save();
      }
    }
    
    // Generar token JWT
    const jwtToken = generateToken(user);
    
    // Guardar sesión
    await Session.create({
      userId: user._id,
      token: jwtToken
    });
    
    // Registrar log de login
    await logAction(user._id, 'LOGIN', { provider: 'google' });
    
    console.log('Login exitoso para:', user.email);
    
    // Enviar respuesta con el balance incluido
    res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        balance: user.role === 'admin' ? Infinity : user.balance,
        plan: user.plan,
        registrationDate: user.createdAt.toLocaleDateString(),
        activePods: 0, // Estos valores se deberían obtener dinámicamente
        totalPods: 0,  // desde la base de datos en una aplicación real
        status: 'online'
      }
    });
  } catch (error) {
    console.error('Error en googleLogin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión con Google',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    // Intentar obtener el token de diferentes fuentes
    let token = null;
    
    // 1. Desde el cuerpo de la solicitud (ideal)
    if (req.body && req.body.token) {
      token = req.body.token;
    }
    // 2. Desde el token ya procesado por el middleware auth
    else if (req.token) {
      token = req.token;
    }
    // 3. Desde el Authorization header como respaldo
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }
    
    console.log('Cerrando sesión con token:', token.substring(0, 20) + '...');
    
    // Eliminar sesión
    const result = await Session.deleteOne({ token });
    
    console.log('Resultado de eliminar sesión:', result);
    
    // Registrar log de logout
    if (req.user) {
      await logAction(req.user._id, 'LOGOUT');
      console.log('Usuario cerró sesión:', req.user.email);
    }
    
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verificar JWT
exports.verifyToken = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }
  
  console.log('Token verificado para usuario:', req.user.email);
  
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role,
      balance: req.user.role === 'admin' ? Infinity : req.user.balance,
      plan: req.user.plan,
      registrationDate: req.user.createdAt.toLocaleDateString(),
      activePods: 0, // Obtener dinámicamente
      totalPods: 0,   // Obtener dinámicamente
      status: 'online'
    }
  });
};

// Obtener perfil del usuario
exports.getMe = async (req, res) => {
  try {
    // El middleware 'protect' ya añade req.user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        balance: user.role === 'admin' ? Infinity : user.balance,
        plan: user.plan,
        registrationDate: user.createdAt.toLocaleDateString(),
        activePods: 0, // Obtener dinámicamente
        totalPods: 0,   // Obtener dinámicamente
        status: 'online',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil de usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar saldo de usuario (para admin)
exports.updateUserBalance = async (req, res) => {
  try {
    const { userId, balance } = req.body;
    
    // Verificar si es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar saldos'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir cambiar el saldo de un admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede ajustar el saldo de un administrador'
      });
    }
    
    user.balance = balance;
    await user.save();
    
    // Registrar acción
    await logAction(req.user._id, 'UPDATE_USER_BALANCE', { 
      userId: user._id, 
      newBalance: balance 
    });
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Error al actualizar saldo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar saldo de usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener todos los usuarios con estadísticas de pods (solo admin)
exports.getAllUsers = async (req, res) => {
  try {
    // Verificar si es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver todos los usuarios'
      });
    }
    
    const { search } = req.query;
    
    // Base query
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Obtener usuarios
    const users = await User.find(query).select('-__v');
    
    // Calcular activePods y totalPods para cada usuario
    const Pod = require('../models/Pod.model');
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const activePods = await Pod.countDocuments({ 
          userId: user._id, 
          status: { $in: ['running', 'creating'] }
        });
        const totalPods = await Pod.countDocuments({ userId: user._id });
        
        // Calcular estado basado en última actividad (simplificado)
        const recentActivity = await Pod.findOne({ 
          userId: user._id, 
          lastActive: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // últimos 30 minutos
        });
        
        return {
          id: user._id,
          email: user.email,
          name: user.name,
          registrationDate: user.createdAt.toLocaleDateString(),
          balance: user.role === 'admin' ? Infinity : user.balance,
          status: recentActivity ? 'online' : 'offline',
          role: user.role,
          activePods,
          totalPods
        };
      })
    );
    
    // Registrar log de acción
    await logAction(req.user._id, 'USERS_LISTED', { count: usersWithStats.length });
    
    res.status(200).json({
      success: true,
      count: usersWithStats.length,
      data: usersWithStats
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de usuarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Suspender usuario - detener todos sus pods activos (solo admin)
exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Verificar si es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para suspender usuarios'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido'
      });
    }
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir suspender a otro admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede suspender a un administrador'
      });
    }
    
    // Obtener todos los pods activos del usuario
    const Pod = require('../models/Pod.model');
    const activePods = await Pod.find({ 
      userId: userId, 
      status: { $in: ['running', 'creating'] }
    });
    
    // Detener todos los pods activos
    // TODO: Cuando se implemente Kubernetes service, usar kubernetesService.stopPod(pod.podId)
    const stoppedPods = [];
    for (const pod of activePods) {
      pod.status = 'stopped';
      pod.lastActive = new Date();
      await pod.save();
      stoppedPods.push(pod.podId);
    }
    
    console.log(`Suspendido usuario ${user.email}, pods detenidos: ${stoppedPods.length}`);
    
    // Registrar log de la acción
    await logAction(req.user._id, 'USER_SUSPENDED', { 
      targetUserId: userId,
      targetUserEmail: user.email,
      podsStopped: stoppedPods.length,
      stoppedPods: stoppedPods
    });
    
    res.status(200).json({
      success: true,
      message: `Usuario ${user.email} suspendido correctamente`,
      data: { 
        userId, 
        userEmail: user.email,
        podsStopped: stoppedPods.length,
        stoppedPods: stoppedPods
      }
    });
  } catch (error) {
    console.error('Error suspendiendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al suspender usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar usuario completamente (solo admin)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar usuarios'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido'
      });
    }
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir eliminar a otro admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar a un administrador'
      });
    }
    
    // No permitir que el admin se elimine a sí mismo
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminarte a ti mismo'
      });
    }
    
    const Pod = require('../models/Pod.model');
    
    // 1. Obtener todos los pods del usuario (para estadísticas)
    const userPods = await Pod.find({ userId });
    const activePods = userPods.filter(pod => pod.status === 'running' || pod.status === 'creating');
    
    // 2. Eliminar todos los pods del usuario
    // TODO: Cuando se implemente Kubernetes service, detener pods activos primero
    const deletedPodsCount = await Pod.deleteMany({ userId });
    
    // 3. Eliminar todas las sesiones del usuario
    const deletedSessionsCount = await Session.deleteMany({ userId });
    
    // 4. Registrar log de la eliminación (antes de eliminar el usuario)
    await logAction(req.user._id, 'USER_DELETED', { 
      targetUserId: userId,
      targetUserEmail: user.email,
      podsDeleted: deletedPodsCount.deletedCount,
      activePods: activePods.length,
      sessionsDeleted: deletedSessionsCount.deletedCount
    });
    
    // 5. Eliminar el usuario
    await User.findByIdAndDelete(userId);
    
    console.log(`Usuario eliminado: ${user.email}, pods: ${deletedPodsCount.deletedCount}, sesiones: ${deletedSessionsCount.deletedCount}`);
    
    res.status(200).json({
      success: true,
      message: `Usuario ${user.email} eliminado correctamente`,
      data: { 
        userId,
        userEmail: user.email,
        podsDeleted: deletedPodsCount.deletedCount,
        sessionsDeleted: deletedSessionsCount.deletedCount,
        activePods: activePods.length
      }
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};