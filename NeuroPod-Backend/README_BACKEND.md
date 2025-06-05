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

# Poblar la base de datos con datos iniciales (templates y precios GPU)
npm run seed
```

## Estructura del Proyecto

```
.env
package.json
README_BACKEND.md
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
│   ├── pod.controller.js       # Gestión de pods en Kubernetes
│   ├── pricing.controller.js  # Gestión de precios de las GPU
│   ├── status.controller.js    # Estado del sistema
│   └── template.controller.js  # Gestión de plantillas
│
├── middleware/           # Middleware personalizado
│   └── auth.middleware.js      # Protección de rutas y autorización
│
├── models/               # Modelos de datos (Mongoose)
│   ├── Log.model.js            # Registro de actividades
│   ├── Pod.model.js            # Información de pods
│   ├── Pricing.model.js        # Información de precios GPU
│   ├── Session.model.js        # Sesiones de usuario
│   ├── Template.model.js       # Plantillas de contenedores
│   └── User.model.js           # Usuarios y roles
│
├── routes/               # Definición de rutas API
│   ├── auth.routes.js          # Rutas de autenticación y gestion de usuarios
│   ├── pod.routes.js           # Rutas para pods
│   ├── pricing.routes.js      # Rutas para precios
│   ├── status.routes.js        # Rutas para estado del sistema
│   └── template.routes.js      # Rutas para plantillas
│
├── seeders/              # Scripts para poblar la base de datos
│   ├── index.js                # Ejecutor principal de seeders
│   ├── pricing.seeder.js       # Precios iniciales predeterminadas
│   └── templates.seeder.js     # Plantillas iniciales predeterminadas
│
├── services/                # Servicios de Kubernetes y monitorizacion
│   ├── kubernetes.service.js   # Manejar operaciones de Kubernetes
│   └── podMonitor.service.js   # Monitorear el estado de los pods y actualizar la base de datos
│
└── utils/                # Utilidades y funciones auxiliares
    ├── errorResponse.js        # Formato estándar para errores
    ├── logger.js               # Sistema de logging
    └── podMonitor.service.js   # Funciones para usadas por kubernetes.service.js 

```

## API Endpoints creadas

### Rutas Públicas `src/app.js`

- ✅ GET `/api/health` - Verificar estado del servidor solo usado en backend

### Rutas de status - `src/routes/status.routes.js`

- ✅ GET `/api/status/public` - Verificar estado público de la API
- ✅ GET `/api/status` - Estado del sistema protegido para dashboard admin

### Autenticación - `src/routes/auth.routes.js`

- ✅ POST `/api/auth/google` - Iniciar sesión con Google OAuth
- ✅ POST `/api/auth/mock-login` - Iniciar sesión simulada (solo en desarrollo)
- ✅ GET `/api/auth/google/callback` - Callback para OAuth de Google
- ✅ POST `/api/auth/logout` - Cerrar sesión
- ✅ GET `/api/auth/verify` - Verificar token JWT
- ✅ GET `/api/auth/me` - Obtener información del usuario actual

### Administración de Usuarios (Admin) - `src/routes/auth.routes.js`

- ✅ GET `/api/auth/users` - Listar todos los usuarios (solo administradores)
- ✅ POST `/api/auth/users/balance` - Actualizar el saldo de un usuario (solo administradores)
- ✅ POST `/api/auth/users/suspend` - Suspender un usuario (solo administradores)
- ✅ DELETE `/api/auth/users/:userId` - Eliminar un usuario (solo administradores)
- ✅ POST `/api/auth/users/fix-balances` - Corregir balances de administradores (solo administradores)

### Gestión de Pods `src\routes\pod.routes.js`

- ✅ GET `/api/pods` - Obtener pods del usuario actual
- ✅ POST ` /api/pods` - Crear nuevo pod
- ✅ GET `/api/pods/admin?userEmail=email` - Admin buscar pods por usuario  
- ✅ GET `/api/pods/:podId/connections` - Información de conexiones
- ✅ GET `/api/pods/:podId/logs` - Logs del pod
- ✅ POST ` /api/pods/:podId/start` - Iniciar pod
- ✅ POST ` /api/pods/:podId/stop` - Detener pod  
- ✅ DELETE ` /api/pods/:podId` - Eliminar pod

### Gestión de Plantillas `src\routes\template.routes.js`

- ✅ GET `/api/templates` - Listar todas las plantillas disponibles
- ✅ POST `/api/templates` - Crear nueva plantilla (solo administradores)
- ✅ GET `/api/templates/summary` - Obtener resumen de plantillas (para dashboard)
- ✅ GET `/api/templates/:id` - Obtener detalles de una plantilla específica
- ✅ PUT `/api/templates/:id` - Actualizar plantilla existente (creador o admin)
- ✅ DELETE `/api/templates/:id` - Eliminar plantilla (creador o admin)

### Gestión de Precios y GPU `src/routes/pricing.routes.js`

- ✅ GET `/api/pricing` - Obtener la configuración actual de precios de recursos (requiere autenticación)
- ✅ GET `/api/pricing/public` - Obtener la configuración actual de precios de recursos
- ✅ POST `/api/pricing/calculate-cost` - Calcular el costo estimado de un pod según los recursos solicitados (requiere autenticación)
- ✅ GET `/api/pricing/gpus/available` - Listar las GPUs disponibles para asignar a pods (requiere autenticación)
- ✅ GET `/api/pricing/gpus/:gpuId` - Obtener información detallada de una GPU específica (requiere autenticación)
- ✅ PUT `/api/pricing` - Actualizar la configuración de precios (solo administradores)
- ✅ POST `/api/pricing/reset` - Restablecer los precios a los valores predeterminados (solo administradores)

## WebSockets

### Eventos WebSocket en `src/socket.js`
- ✅ `connection` - Establecer conexión WebSocket
- ✅ `disconnect` - Manejar desconexiones
- ✅ `subscribe` / `unsubscribe` - Suscribirse/desuscribirse a salas de pods
- ✅ `requestLogs` - Solicitar logs de un pod
- ✅ `podUpdate` - Actualización de estado de un pod
- ✅ `podLogs` - Enviar logs de un pod
- ✅ `podCreated` - Notificar creación de un nuevo pod
- ✅ `podDeleted` - Notificar eliminación de un pod
- ✅ `adminNotification` - Notificación a administradores
- ✅ `lowBalanceAlert` - Alerta de saldo bajo
- ✅ `ping` / `pong` - Mantener conexión viva

## 🛠️ Desarrollo Local

### Requisitos
- Node.js 22 o superior
- npm
- MongoDB en ejecución (puedes usar Docker para levantar una instancia)
- Cluster de Kubernetes levantado y configurado (opcional para desarrollo local)

### Configuración del Entorno
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Zidane0MA/NeuroPod.git
   cd NeuroPod-Backend
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar el archivo `.env`**:
   - Crea un archivo `.env` basado en el archivo `.env.example` y configura las variables necesarias, como la conexión a MongoDB, credenciales de OAuth, etc.

4. **Iniciar el servidor**:
   ```bash
   npm run dev # Para desarrollo
   npm start # Para producción
   ```
5. **Poblar la base de datos**:
   ```bash
   npm run seed
   ```
6. **Acceder a la API**:
   - La API estará disponible en `http://localhost:3000/api/health` o `https://api.neuropod.online/api/health` si estás en producción.

## Cambios Pendientes por Implementar

1. **Integración con Kubernetes**:
   - Mejorar la lógica para desplegar pods en un clúster de Kubernetes
   - Integrar el uso de plantillas en el proceso de despliegue de pods

2. **Monitoreo en Tiempo Real**:
   - Mejorar WebSockets para transmitir métricas de uso de recursos
   - Implementar sistema para obtener estadísticas de uso de CPU, memoria, GPU y espacio de discos

## Notas Importantes

- Asegúrate de que MongoDB esté en ejecución antes de iniciar el servidor
- Para desarrollo local, puedes usar `mockLogin` en lugar de OAuth
- El usuario con correo `lolerodiez@gmail.com` siempre tendrá rol de administrador
- Todos los contenedores se gestionan a través de la API de Kubernetes
- Ejecuta `npm run seed` después de la primera instalación para crear las plantillas y precios GPU predeterminadas

## Plantillas Predeterminadas

El sistema incluye las siguientes plantillas por defecto:

1. **Ubuntu Base** - Entorno Ubuntu 22.04 con Jupyter Lab y servidor web
2. **ComfyUI** - Entorno preconfigurado para generación de imágenes con IA
3. **Python Data Science** - Entorno completo para ciencia de datos con Python y R

Estas plantillas se crean automáticamente al ejecutar el seeder y proporcionan configuraciones listas para usar.
