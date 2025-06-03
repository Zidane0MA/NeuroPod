# Autenticación en NeuroPod

Este documento describe el sistema de autenticación implementado en NeuroPod, incluyendo los métodos de autenticación, flujo de trabajo, configuración y manejo de sesiones.
Tambien incluye una guía para la configuración de la autenticación con Google OAuth2 y el manejo de sesiones desde variables de entorno.

## Métodos de Autenticación

NeuroPod soporta dos métodos de autenticación:

1. **Google OAuth2 (Recomendado para producción)**
   - Utiliza el estándar OAuth2 de Google para autenticar usuarios
   - Requiere que los usuarios tengan una cuenta de Google
   - Proporciona un alto nivel de seguridad y confiabilidad

2. **Autenticación Simulada (Solo para desarrollo)**
   - Permite iniciar sesión con cualquier correo electrónico sin verificación real
   - Solo disponible cuando `NODE_ENV=development`
   - Útil para pruebas rápidas en desarrollo

## Componentes del Sistema

### Frontend
- Utiliza `@react-oauth/google` para la integración con Google OAuth2
- Implementa flujo de autenticación implícita (sin redirecciones)
- Almacena tokens JWT en localStorage para mantener la sesión

### Backend
- Verifica tokens de Google mediante la API de Google
- Genera tokens JWT propios para la sesión
- Implementa verificación de roles y permisos
- Gestiona la creación y actualización de usuarios

## Guia Configuración

### 1. Google Cloud Console

Para que la autenticación con Google funcione, se debe configurar un proyecto en Google Cloud Console:

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Configurar la pantalla de consentimiento OAuth
3. Crear credenciales OAuth para aplicación web
4. Configurar los orígenes autorizados y URIs de redirección:

**Orígenes autorizados de JavaScript:**
- `http://localhost:5173` (desarrollo)
- `https://app.neuropod.online` (producción)

**URIs de redirección autorizados:**
- `http://localhost:5173`
- `http://localhost:5173/login`
- `https://app.neuropod.online`
- `https://app.neuropod.online/login`

### 2. Variables de Entorno Frontend (.env)

```
# API URL
VITE_API_URL=http://localhost:3000
VITE_API_URL_HTTPS=https://api.neuropod.com
# Google OAuth Client ID (desde Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=tu_google_client_id_aqui
```

### 3. Variables de Entorno Backend (.env)

```
# Entorno
NODE_ENV=production  # 'development' o 'production'

# Servidor
PORT=3000

# Base de datos
MONGODB_URI=mongodb://localhost:27017/plataforma

# JWT (Autenticación)
JWT_SECRET=cambiar_por_clave_segura_en_produccion
JWT_EXPIRE=24h

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Frontend
FRONTEND_URL=http://localhost:5173
FRONTEND_URL_HTTPS=https://app.neuropod.online

# Control de acceso
TRUST_GOOGLE_AUTH=true  # 'true' para confiar únicamente en verificación de Google
ADMIN_EMAILS=lolerodiez@gmail.com  # Correos que tendrán rol de administrador
```

## Flujo de Autenticación

### Login/Signup con Google

1. El usuario hace clic en el botón de Google en la página de login/signup
2. Google muestra el selector de cuentas
3. Al seleccionar una cuenta, Google devuelve un token ID
4. El frontend envía este token al backend (`/api/auth/google`)
5. El backend verifica el token con Google
6. Si el usuario no existe, se crea; si existe, se actualiza su información
7. El backend genera un JWT propio y lo devuelve al frontend
8. El frontend almacena el JWT y redirecciona al dashboard

### Verificación de Sesión

1. Al cargar la aplicación, se verifica si hay un JWT en localStorage
2. Si existe, se envía al backend para verificar su validez (`/api/auth/verify`)
3. Si es válido, se carga la información del usuario
4. Si no es válido, se redirecciona al login

## Cierre de Sesión

El sistema implementa un cierre de sesión seguro que:

1. **Elimina el token JWT del servidor**:
   - Borra la sesión almacenada en la base de datos
   - Registra el evento de cierre de sesión en el log

2. **Elimina los datos locales en el cliente**:
   - Borra el token y la información del usuario del localStorage
   - Restablece el estado de la aplicación

3. **Proporciona feedback visual**:
   - Notifica al usuario que la sesión se ha cerrado correctamente
   - Redirecciona a la página de login

4. **Maneja errores graciosamente**:
   - Si hay problemas de comunicación con el servidor, limpia los datos locales de todas formas
   - Nunca deja al usuario en un estado intermedio o inconsistente

### Proceso Técnico

1. **Frontend** (`AuthContext.tsx`)
   ```typescript
   const logout = async () => {
     try {
       // Intentar logout en el servidor si hay conexión
       if (!isOfflineMode) {
         await authService.logout();
       }
       // Limpiar datos locales
       setUser(null);
       localStorage.removeItem("token");
       localStorage.removeItem("user");
       // Feedback visual y redirección
       toast({ title: "Sesión cerrada", ... });
       navigate("/login");
     } catch (error) {
       // Manejar errores pero seguir con el cierre local
       console.error('Error durante logout:', error);
       // Limpiar datos de todas formas
       setUser(null);
       localStorage.removeItem(...)
     }
   };
   ```

2. **Backend** (`auth.controller.js`)
   ```javascript
   exports.logout = async (req, res) => {
     try {
       // Obtener token de diferentes fuentes
       let token = req.body.token || req.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
       
       // Eliminar sesión de la base de datos
       await Session.deleteOne({ token });
       
       // Registrar evento
       if (req.user) {
         await logAction(req.user._id, 'LOGOUT');
       }
       
       res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
     } catch (error) {
       // Manejar errores
     }
   };
   ```

### Mejoras Pendientes

- Implementar la opción de cerrar todas las sesiones activas de un usuario
- Añadir registro de dispositivo/navegador en la información de sesión
- Permitir a los usuarios ver y gestionar sus sesiones activas

## Control de Acceso

### Verificación de Usuario

En modo producción, el sistema puede:

1. **Confiar exclusivamente en Google OAuth** (`TRUST_GOOGLE_AUTH=true`)
   - Si Google permite la autenticación (el usuario está registrado como usuario de prueba), se le permite acceder
   - Los roles (admin/client) se asignan según la lista `ADMIN_EMAILS`

2. **Verificar adicionalmente una lista de permitidos** (`TRUST_GOOGLE_AUTH=false`)
   - Además de pasar por Google, se verifica que el correo esté en `ALLOWED_EMAILS`
   - Proporciona un doble nivel de seguridad

### Asignación de Roles

- Los correos especificados en `ADMIN_EMAILS` reciben automáticamente rol de administrador
- El resto de usuarios reciben rol de cliente
- Los roles se actualizan en cada inicio de sesión según la configuración actual

## Seguridad

- Los tokens JWT expiran según el tiempo configurado en `JWT_EXPIRE`
- Todas las rutas protegidas verifican la validez del token y los permisos del usuario
- Las contraseñas y tokens sensibles no se almacenan en el frontend

## Solución de Problemas

### Errores comunes

- **Error `[GSI_LOGGER]: The given origin is not allowed for the given client ID`**:
  - Es un error relacionado con la función "One Tap" de Google, pero no afecta la funcionalidad principal
  - Asegúrate de que todos los orígenes estén correctamente configurados en Google Cloud Console

- **Error `Cross-Origin-Opener-Policy policy would block the window.postMessage call`**:
  - Error relacionado con políticas de seguridad del navegador
  - No afecta la funcionalidad principal de autenticación
  - Puedes desactivar `useOneTap` si estos errores son problemáticos

### Verificación de funcionamiento

- Si ves el mensaje `Google login success, credential: [CREDENTIAL PRESENT]` en la consola, la autenticación funciona correctamente
- Puedes comprobar el rol asignado en la consola del backend cuando un usuario inicia sesión

## Desarrollo vs Producción

- En desarrollo (`NODE_ENV=development`), el sistema es más permisivo y ofrece opciones de simulación
- En producción (`NODE_ENV=production`), se aplican todas las restricciones de seguridad
- Para probar el comportamiento exacto de producción, configura `NODE_ENV=production` en desarrollo

## Estado Actual

✅ **Completado**: El sistema de autenticación está completamente implementado y funcional, incluyendo:
- Integración con Google OAuth2
- Diferenciación de roles (admin/cliente)
- Restricciones de acceso configurables
- Modo de desarrollo para pruebas rápidas
- Cierre de sesión seguro con manejo de errores