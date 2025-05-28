# NeuroPod Backend

Backend para la plataforma NeuroPod que permite gestionar contenedores Docker a través de una interfaz web con autenticación de usuarios.

## Características principales

- Autenticación de usuarios con Google OAuth y JWT
- Gestión de sesiones y control de acceso basado en roles
- API RESTful para gestionar pods y contenedores
- WebSockets para comunicación en tiempo real
- Integración con Kubernetes para el despliegue dinámico de contenedores

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start

# Poblar la base de datos con datos iniciales
npm run seed

# Poblar solo las plantillas predeterminadas
npm run seed:templates
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/plataforma
JWT_SECRET=tu_clave_secreta_super_segura
JWT_EXPIRE=24h
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
FRONTEND_URL=http://localhost:5173
ADMIN_EMAILS=lolerodiez@gmail.com
```

## Estructura del Proyecto

```
src/
├── app.js                # Configuración de Express
├── server.js             # Punto de entrada
├── socket.js             # Configuración de WebSockets
│
├── config/               # Configuración y conexión a servicios
│   └── db.js             # Conexión a MongoDB
│
├── controllers/          # Controladores para la lógica de negocio
│   ├── auth.controller.js      # Autenticación y gestión de usuarios
│   ├── container.controller.js # Gestión de contenedores
│   ├── pod.controller.js       # Gestión de pods en Kubernetes
│   ├── status.controller.js    # Estado del sistema
│   └── template.controller.js  # Gestión de plantillas
│
├── middleware/           # Middleware personalizado
│   └── auth.middleware.js      # Protección de rutas y autorización
│
├── models/               # Modelos de datos (Mongoose)
│   ├── Log.model.js            # Registro de actividades
│   ├── Pod.model.js            # Información de pods
│   ├── Session.model.js        # Sesiones de usuario
│   ├── Template.model.js       # Plantillas de contenedores
│   └── User.model.js           # Usuarios y roles
│
├── routes/               # Definición de rutas API
│   ├── auth.routes.js          # Rutas de autenticación
│   ├── container.routes.js     # Rutas para contenedores
│   ├── pod.routes.js           # Rutas para pods
│   ├── status.routes.js        # Rutas para estado del sistema
│   └── template.routes.js      # Rutas para plantillas
│
├── utils/                # Utilidades y funciones auxiliares
│   ├── errorResponse.js        # Formato estándar para errores
│   └── logger.js               # Sistema de logging
│
└── seeders/              # Scripts para poblar la base de datos
    ├── index.js                # Ejecutor principal de seeders
    └── templates.seeder.js     # Plantillas predeterminadas
```

## API Endpoints

### Rutas Públicas

- GET `/api/health` - Verificar estado del servidor
- GET `/api/status/public` - Verificar estado público de la API

### Autenticación

- POST `/api/auth/google` - Iniciar sesión con Google OAuth
- POST `/api/auth/mock-login` - Iniciar sesión simulada (solo en desarrollo)
- GET `/api/auth/google/callback` - Callback para OAuth de Google
- POST `/api/auth/logout` - Cerrar sesión
- GET `/api/auth/verify` - Verificar token JWT
- GET `/api/auth/me` - Obtener información del usuario actual

### Administración de Usuarios (Admin)

- GET `/api/auth/users` - Obtener lista de usuarios
- POST `/api/auth/users/balance` - Actualizar saldo de usuario

### Gestión de Pods

- GET `/api/pods` - Listar pods del usuario
- POST `/api/pods` - Crear nuevo pod
- GET `/api/pods/:id` - Obtener detalles de un pod
- DELETE `/api/pods/:id` - Eliminar un pod
- POST `/api/pods/:id/start` - Iniciar un pod detenido
- POST `/api/pods/:id/stop` - Detener un pod en ejecución
- GET `/api/pods/:id/logs` - Obtener logs de un pod

### Gestión de Plantillas

- GET `/api/templates` - Listar todas las plantillas disponibles
- GET `/api/templates/summary` - Obtener resumen de plantillas (para dashboard)
- GET `/api/templates/:id` - Obtener detalles de una plantilla específica
- POST `/api/templates` - Crear nueva plantilla (solo administradores)
- PUT `/api/templates/:id` - Actualizar plantilla existente (creador o admin)
- DELETE `/api/templates/:id` - Eliminar plantilla (creador o admin)

### Estado del Sistema

- GET `/api/status` - Obtener métricas y estado del sistema (requiere autenticación)

## Cambios Pendientes por Implementar

1. **Integración con Kubernetes**:
   - Implementar la lógica para desplegar pods en un clúster de Kubernetes
   - Configurar volúmenes persistentes para el directorio `/workspace`
   - Implementar la creación dinámica de subdominios para los pods
   - Integrar el uso de plantillas en el proceso de despliegue de pods

2. **Gestión de Plantillas** ✅ **IMPLEMENTADO**:
   - ✅ Crear modelos y rutas para gestionar templates
   - ✅ Implementar la API para crear, modificar y eliminar plantillas
   - ✅ Sistema de validación para plantillas
   - ✅ Plantillas predeterminadas mediante seeders

3. **Sistema de Pagos y Saldo**:
   - Implementar la lógica para descontar saldo según el uso de recursos
   - Agregar endpoints para que los administradores asignen saldo a usuarios
   - Crear sistema de notificaciones para saldo bajo

4. **Monitoreo en Tiempo Real**:
   - Mejorar WebSockets para transmitir métricas de uso de recursos
   - Implementar sistema para obtener estadísticas de uso de CPU, memoria y GPU

5. **Seguridad**:
   - Implementar rate limiting para prevenir abusos
   - Mejorar validación de entrada en todos los endpoints
   - Implementar registros de auditoría más detallados

## Notas Importantes

- Asegúrate de que MongoDB esté en ejecución antes de iniciar el servidor
- Para desarrollo local, puedes usar `mockLogin` en lugar de OAuth
- El usuario con correo `lolerodiez@gmail.com` siempre tendrá rol de administrador
- Todos los contenedores se gestionan a través de la API de Kubernetes
- Ejecuta `npm run seed` después de la primera instalación para crear las plantillas predeterminadas

## Plantillas Predeterminadas

El sistema incluye las siguientes plantillas por defecto:

1. **Ubuntu Base** - Entorno Ubuntu 22.04 con Jupyter Lab y servidor web
2. **ComfyUI** - Entorno preconfigurado para generación de imágenes con IA
3. **Python Data Science** - Entorno completo para ciencia de datos con Python y R

Estas plantillas se crean automáticamente al ejecutar el seeder y proporcionan configuraciones listas para usar.
