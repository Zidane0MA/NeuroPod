## 📘 Guía de Despliegue Paso a Paso (Windows)

### 1. Configuración inicial del entorno

#### Preparar el sistema Windows
```powershell
# Instalar Node.js desde el instalador oficial
# Descarga desde https://nodejs.org/en/download/

# Instalar MongoDB Community Edition para Windows
# Descarga desde https://www.mongodb.com/try/download/community

# Verificar instalaciones (en PowerShell o CMD)
node --version
npm --version
# MongoDB debe estar disponible en C:\Program Files\MongoDB\Server\[versión]\bin\mongod.exe
```

#### Instalar Minikube y Kubectl en Windows
```powershell
# Instalar Chocolatey (gestor de paquetes para Windows)
# Ejecutar PowerShell como administrador
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar kubectl usando Chocolatey
choco install kubernetes-cli

# Instalar Minikube usando Chocolatey
choco install minikube

# Iniciar Minikube (con Docker Desktop o VirtualBox)
# Si usas Docker Desktop:
minikube start --driver=docker
# Si usas VirtualBox:
# minikube start --driver=virtualbox

# Habilitar Ingress en Minikube
minikube addons enable ingress
```

#### Configurar Cloudflare Tunnel en Windows
```powershell
# Descargar e instalar cloudflared para Windows
# Desde: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi

# Autenticar cloudflared (ejecutar cmd o PowerShell como administrador)
cloudflared.exe tunnel login

# Crear un tunnel
cloudflared.exe tunnel create neuropod-tunnel

# Crear el archivo de configuración
# Típicamente en C:\Users\<tu-usuario>\.cloudflared\
mkdir -p $env:USERPROFILE\.cloudflared
```

Crear archivo `%USERPROFILE%\.cloudflared\config.yml`:
```yaml
tunnel: neuropod-tunnel
credentials-file: C:\Users\<tu-usuario>\.cloudflared\neuropod-tunnel.json

ingress:
  - hostname: app.neuropod.online
    service: http://localhost:5173
  - hostname: api.neuropod.online
    service: http://localhost:3000
  - hostname: "*.neuropod.online"
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

### 2. Configuración de DNS en Cloudflare

1. Accede al dashboard de Cloudflare
2. Selecciona tu dominio `neuropod.online`
3. Ve a la sección DNS
4. Crea los siguientes registros:
   - Tipo: CNAME, Nombre: app, Destino: (tunnel-id).cfargotunnel.com
   - Tipo: CNAME, Nombre: api, Destino: (tunnel-id).cfargotunnel.com
   - Tipo: CNAME, Nombre: *, Destino: (tunnel-id).cfargotunnel.com

### 3. Iniciar servicios en Windows

```powershell
# Iniciar Minikube si no está en ejecución
minikube start

# MongoDB debería estar ejecutándose como servicio si lo instalaste como tal
# Si no, inicia MongoDB manualmente (como administrador)
# "C:\Program Files\MongoDB\Server\[versión]\bin\mongod.exe" --dbpath="C:\data\db"

# Iniciar Cloudflare Tunnel (como administrador)
cloudflared.exe tunnel run neuropod-tunnel

# En otra terminal, iniciar el backend (ubicado en C:\path\to\backend)
cd C:\path\to\backend
npm install
npm run dev  # Debe ejecutarse en puerto 3000

# En otra terminal, iniciar el frontend (ubicado en C:\path\to\frontend)
cd C:\path\to\frontend
npm install
npm run dev  # Debe ejecutarse en puerto 5173
```

### 4. Verificación del despliegue en Windows

1. Comprobar que todos los servicios están funcionando:
   ```powershell
   # Verificar Minikube
   kubectl get nodes
   
   # Verificar NGINX Ingress Controller
   kubectl get pods -n ingress-nginx
   
   # Verificar MongoDB
   # Si tienes mongosh instalado:
   mongosh --eval "db.adminCommand('ping')"
   # O con mongo.exe:
   "C:\Program Files\MongoDB\Server\[versión]\bin\mongo.exe" --eval "db.adminCommand('ping')"
   ```

2. Verificar acceso a través de Cloudflare Tunnel:
   - Acceder a https://app.neuropod.online (debería mostrar el frontend)
   - Acceder a https://api.neuropod.online/status (debería responder el backend)

3. Probar el despliegue de un contenedor y verificar que se genera un subdominio accesible.

### 5. Solución de problemas comunes en Windows

- **Error de Hyper-V**: Asegúrate de que Hyper-V está habilitado si usas este hipervisor (requiere Windows 10/11 Pro o Enterprise)
- **Docker Desktop no detectado**: Verifica que Docker Desktop está en ejecución antes de iniciar Minikube
- **Problemas de permisos**: Ejecuta los comandos en PowerShell o CMD como administrador
- **Puertos bloqueados**: Verifica que el firewall de Windows no está bloqueando los puertos necesarios (3000, 5173, 443)
- **Cloudflared no se inicia**: Asegúrate de que el archivo de configuración tiene las rutas correctas y formato adecuado
- **NGINX Ingress no funciona**: Verifica que el addon está habilitado con `minikube addons list`## 📝 Ejemplo de Código para Creación Dinámica de Recursos (Windows)

### Ejemplo de creación de Pod, Service e Ingress desde Node.js:

```javascript
// Importaciones necesarias
const k8s = require('@kubernetes/client-node');
const path = require('path');
const fs = require('fs');
const Container = require('../models/container'); // Modelo Mongoose

// Configuración de kubernetes-client
const kc = new k8s.KubeConfig();

// En Windows, el archivo config de kubectl está en:
// C:\Users\<tu-usuario>\.kube\config
// Si estás usando Minikube, se puede cargar automáticamente:
kc.loadFromDefault();

// Función para desplegar un pod con su service e ingress
async function deployContainerWithIngress(userId, containerType, imageTag) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
  
  // Generar nombres únicos
  const timestamp = Date.now();
  const podName = `${containerType}-${userId}-${timestamp}`;
  const subdomain = `${containerType}-${userId.substring(0, 8)}-${timestamp.toString().substring(8)}`;
  
  // Crear Pod
  const pod = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      labels: {
        app: podName,
        user: userId,
        type: containerType
      }
    },
    spec: {
      containers: [
        {
          name: containerType,
          image: imageTag,
          ports: [{ containerPort: 8080 }],
          resources: {
            limits: {
              cpu: '1',
              memory: '2Gi'
            }
          },
          volumeMounts: [
            {
              name: 'workspace',
              mountPath: '/workspace'
            }
          ]
        }
      ],
      volumes: [
        {
          name: 'workspace',
          persistentVolumeClaim: {
            claimName: `workspace-${userId}`
          }
        }
      ]
    }
  };
  
  // Crear Service
  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: podName
    },
    spec: {
      selector: {
        app: podName
      },
      ports: [
        {
          port: 80,
          targetPort: 8080
        }
      ]
    }
  };
  
  // Crear Ingress
  const ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: podName,
      annotations: {
        'kubernetes.io/ingress.class': 'nginx'
      }
    },
    spec: {
      rules: [
        {
          host: `${subdomain}.neuropod.online`,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: podName,
                    port: {
                      number: 80
                    }
                  }
                }
              }
            ]
          }
        }
      ]
    }
  };
  
  try {
    // Aplicar los recursos
    await k8sApi.createNamespacedPod('default', pod);
    await k8sApi.createNamespacedService('default', service);
    await k8sNetworkingApi.createNamespacedIngress('default', ingress);
    
    // Guardar en MongoDB
    await Container.create({
      userId,
      podName,
      containerType,
      imageTag,
      url: `https://${subdomain}.neuropod.online`,
      status: 'creating',
      createdAt: new Date(),
      cost: calculateCostPerHour(containerType)
    });
    
    return {
      podName,
      url: `https://${subdomain}.neuropod.online`
    };
  } catch (error) {
    console.error('Error al desplegar contenedor:', error);
    throw error;
  }
}

// Función para crear un PVC si no existe
async function createWorkspacePVCIfNeeded(userId) {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const pvcName = `workspace-${userId}`;
  
  try {
    // Intentar obtener el PVC para ver si ya existe
    await k8sApi.readNamespacedPersistentVolumeClaim(pvcName, 'default');
    console.log(`PVC ${pvcName} ya existe`);
    return;
  } catch (error) {
    // El PVC no existe, lo creamos
    if (error.statusCode === 404) {
      const pvc = {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
          name: pvcName
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '5Gi'
            }
          }
        }
      };
      
      await k8sApi.createNamespacedPersistentVolumeClaim('default', pvc);
      console.log(`PVC ${pvcName} creado correctamente`);
      return;
    }
    
    throw error;
  }
}

// Función para calcular el costo por hora según el tipo de contenedor
function calculateCostPerHour(containerType) {
  const costsPerHour = {
    'comfy': 0.5,  // 0.5€ por hora
    'ubuntu': 0.3, // 0.3€ por hora
    'custom': 0.7  // 0.7€ por hora
  };
  
  return costsPerHour[containerType] || 0.5; // Valor por defecto
}

module.exports = {
  deployContainerWithIngress,
  createWorkspacePVCIfNeeded
};
```

### Configuración de Cloudflared para Windows:

```yaml
# C:\Users\<tu-usuario>\.cloudflared\config.yml
tunnel: neuropod-tunnel
credentials-file: C:\Users\<tu-usuario>\.cloudflared\neuropod-tunnel.json

ingress:
  - hostname: app.neuropod.online
    service: http://localhost:5173
  - hostname: api.neuropod.online
    service: http://localhost:3000
  - hostname: "*.neuropod.online"
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

### Ejemplo de modelo Mongoose para Contenedores:

```javascript
const mongoose = require('mongoose');

const ContainerSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  podName: { 
    type: String, 
    required: true,
    unique: true 
  },
  containerType: { 
    type: String, 
    required: true,
    enum: ['comfy', 'ubuntu', 'custom'] 
  },
  imageTag: { 
    type: String, 
    required: true 
  },
  url: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['creating', 'running', 'stopped', 'error'],
    default: 'creating'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  cost: { 
    type: Number, 
    required: true 
  },
  totalCost: { 
    type: Number, 
    default: 0 
  }
});

module.exports = mongoose.model('Container', ContainerSchema);
```
## 📋 Información del Proyecto

**Nombre del Proyecto**: Neuropod  
**Dominio**: neuropod.online  
**Objetivo**: Plataforma para gestionar y ejecutar contenedores Docker a través de una interfaz web con autenticación de usuarios. ComfyUI está disponible como una plantilla predefinida, al igual que Ubuntu, pero cualquier imagen Docker podrá ejecutarse manualmente.   
**Tecnologías principales**: MongoDB, Node.js, React, Kubernetes, Docker, NGINX Ingress, Cloudflare Tunnel  
**Base de datos**: `plataforma` (gestionada con mongosh)  
**Modelo de negocio**: Los usuarios tienen un saldo inicial de 10€, que gastan al ejecutar contenedores. El administrador tiene saldo infinito y puede configurar precios.  

Neuropod es una plataforma que permitirá a los usuarios iniciar sesión, gestionar y ejecutar múltiples contenedores Docker a través de una interfaz web intuitiva. Cada contenedor será accesible mediante su propio subdominio dinámico (ej. `comfy-usuario123-4567.neuropod.online`). El sistema gestionará la autenticación, sesiones, y desplegará los contenedores necesarios en Kubernetes de forma dinámica según las peticiones de los usuarios. Los contenedores tendrán un directorio `/workspace` que persistirá entre sesiones para almacenar datos del usuario.# 🚀 Plan de Pasos Personalizado para Proyecto Neuropod

## 🛠️ Fase 1 — Prepara la base

1. **Instala MongoDB en tu máquina** (o en una VM externa si prefieres):
   * MongoDB Community Server.
   * Asegúrate que se puede acceder en `localhost:27017`.
   * Prueba instalar herramientas como **Mongo Compass** para visualizar datos.
   * Utiliza mongosh para gestionar la base de datos desde la terminal.

2. **Crea una base de datos Mongo y una colección básica**:
   * Base de datos: `plataforma`.
   * Colecciones: `usuarios`, `sesiones`, `logs`, `contenedores`, `plantillas`, `transacciones`.
   * No hace falta aún programar nada: solo crea un esquema inicial.
   * Define un modelo de datos para gestionar saldo de usuarios.

3. **Prepara Minikube e instala Kubernetes local**:
   * Instala Minikube y kubectl.
   * Asegúrate que puedes hacer `kubectl get nodes` y ves el nodo `minikube`.
   * Familiarízate con los comandos básicos: `apply`, `get pods`, `describe`.
   * Configura un espacio de nombres (namespace) dedicado para Neuropod.
   * Activa el addon de NGINX Ingress Controller en Minikube:
     ```bash
     minikube addons enable ingress
     ```
   * Prueba a desplegar contenedores simples para verificar la configuración.

## 🖥️ Fase 2 — Desarrolla el Backend

1. **Crea el proyecto Node.js Backend**:
   * Express.js como framework.
   * Despliega el backend en `localhost:3000` (será accesible como `api.neuropod.online`).
   * Endpoints básicos: `/api/auth/login`, `/api/auth/verify`, `/api/status`, `/api/pods/start`, `/api/pods/stop`.
   * Implementa Google OAuth2 con `google-auth-library`.
   * Desarrolla API diferenciada para roles de admin y cliente.
   * Crea endpoints específicos para la gestión de plantillas y usuarios.

2. **Conecta el Backend a MongoDB**:
   * Usa `mongoose` para interactuar con la base de datos MongoDB.
   * Crea modelos para usuarios, sesiones, logs, contenedores, plantillas y transacciones.
   * Implementa la lógica básica de crear/buscar usuarios tras login.
   * Configura lógica para gestionar el saldo de los usuarios (10€ iniciales para clientes).

3. **Agrega control de sesiones con JWT**:
   * Login de Google ➔ si es válido, emites un JWT ➔ frontend guarda el JWT.
   * Implementa middleware de autenticación para proteger rutas privadas.
   * Verifica rol de usuario (admin vs cliente) para el acceso a rutas protegidas.
   * Crea usuario admin especial con correo lolerodiez@gmail.com.

4. **Integración con Kubernetes**:
   * Usa la biblioteca `@kubernetes/client-node` para interactuar con la API de Kubernetes.
   * Crea funciones para desplegar de forma dinámica:
     * Pods (contenedores de usuario)
     * Services (para exponer los pods)
     * Ingress (para crear subrutas o subdominios personalizados)
   * Implementa sistema para montar volumen persistente en `/workspace`.
   * Configura plantillas predefinidas (ComfyUI, Ubuntu) y posibilidad de añadir imágenes personalizadas.
   * Genera URLs personalizadas para cada pod (ej: `comfy-usuario123-4567.neuropod.online`).

5. **Implementación de WebSockets**:
   * Crea WebSockets para comunicación en tiempo real con el frontend.
   * Envía actualizaciones sobre el estado de los contenedores.
   * Implementa notificaciones para eventos importantes (contenedor iniciado, detenido, error).
   * Actualiza en tiempo real el saldo del usuario al usar recursos.

## 🌐 Fase 3 — Desarrolla el Frontend

1. **Crea el proyecto Frontend en React**:
   * Despliega el frontend en `localhost:5173` (será accesible como `app.neuropod.online`).
   * Página de login usando Google OAuth2.
   * Gestión de JWT: almacenar en localStorage o cookies seguras.
   * Diseña dos interfaces diferenciadas:
     * **Panel de administrador** (`/dashboard`, `/admin/pods`, `/admin/pods/deploy`, `/admin/users`, `/admin/settings`, `/admin/help`)
     * **Panel de cliente** (`/dashboard`, `/client/stats`, `/client/pods`, `/client/pods/deploy`, `/client/settings`, `/client/help`)

2. **Panel de administrador**:
   * Dashboard principal con resumen de usuarios, contenedores activos y estadísticas.
   * Gestión de usuarios: ver, editar saldo, bloquear/desbloquear.
   * Configuración de precios por contenedor y tiempo de uso.
   * Gestión de plantillas predefinidas y personalización de imágenes.
   * Logs y monitoreo de actividad.

3. **Panel de cliente**:
   * Dashboard con información de bienvenida y estado actual.
   * Gestión de pods: ver contenedores activos, iniciar nuevos, detener existentes.
   * Interfaz para acceder a los subdominios generados (ej. `comfy-usuario123-4567.neuropod.online`).
   * Estadísticas de uso y saldo disponible (de los 10€ iniciales).
   * Guías de uso y documentación de ayuda.

4. **Comunicación Frontend → Backend**:
   * Axios para peticiones REST hacia `api.neuropod.online`.
   * WebSockets para recibir actualizaciones en tiempo real.
   * Gestión de errores y estados de carga.
   * Implementación de notificaciones y alertas.
   * Redirección a los subdominios generados para cada contenedor.

## 🧱 Fase 4 — Contenedores y Kubernetes

1. **Configuración de Kubernetes para contenedores on-demand**:
   * Crea plantillas YAML para despliegue dinámico de:
     * Pods para cada usuario
     * Services para exponer los pods 
     * Ingress para crear subdominios únicos
   * Configura plantillas predefinidas para ComfyUI y Ubuntu.
   * Implementa sistema para que los usuarios puedan seleccionar cualquier imagen Docker.
   * Configura límites de recursos por tipo de contenedor.

2. **NGINX Ingress Controller**:
   * Asegúrate que NGINX Ingress Controller está funcionando correctamente.
   * Configura reglas de enrutamiento dinámicas para los pods.
   * Crea sistema para generar automáticamente subdominios únicos:
     * Formato: `{tipo-contenedor}-{usuario}-{id}.neuropod.online`
     * Ejemplo: `comfy-usr123-16839245.neuropod.online`
   * Configura NGINX para gestionar tráfico HTTPS recibido desde Cloudflare Tunnel.

3. **Persistent Volume Claims (PVC)**:
   * Configura almacenamiento persistente para montarse en `/workspace`.
   * Asegura que los datos persisten entre reinicios del contenedor.
   * Implementa una estructura que separe los datos de cada usuario.
   * Configura permisos adecuados para cada volumen.

4. **Configuración de Cloudflare Tunnel**:
   * Instala `cloudflared` en tu máquina host.
   * Crea un túnel para Neuropod:
     ```bash
     cloudflared tunnel create neuropod-tunnel
     ```
   * Configura el archivo `~/.cloudflared/config.yml`:
     ```yaml
     tunnel: neuropod-tunnel
     credentials-file: /home/usuario/.cloudflared/neuropod-tunnel.json

     ingress:
       - hostname: app.neuropod.online
         service: http://localhost:5173
       - hostname: api.neuropod.online
         service: http://localhost:3000
       - hostname: "*.neuropod.online"
         service: https://localhost:443
         originRequest:
           noTLSVerify: true
       - service: http_status:404
     ```
   * Configura DNS wildcard en Cloudflare para `*.neuropod.online`.
   * Inicia el túnel y verifica la conectividad.

5. **Implementa sistema de precios**:
   * Configuración de costos por tipo de contenedor y tiempo de uso.
   * Descuento automático del saldo del usuario en función del uso.
   * Notificaciones cuando el saldo se esté agotando.
   * Parada automática de contenedores cuando se agote el saldo.

## 🔐 Fase 5 — Pulido y Cierre

1. **Configuración de Google Cloud Console**:
   * Crea un proyecto en Google Cloud Console.
   * Configura las credenciales OAuth2 para permitir el login con Google.
   * Define los URI de redirección autorizados para `app.neuropod.online`.
   * Configura el consentimiento OAuth y los ámbitos necesarios.
   * Obtén las credenciales de cliente (CLIENT_ID, CLIENT_SECRET) para backend.

2. **Seguridad para Neuropod**:
   * HTTPS automático para todos los subdominios gracias a Cloudflare.
   * Implementa protección contra ataques comunes (CSRF, XSS, inyección).
   * Asegura que MongoDB solo permite conexiones autorizadas.
   * Usa variables de entorno para tus secretos (JWT keys, claves OAuth2, etc.).
   * Configura Network Policies en Kubernetes para aislar los pods.
   * Implementa rate limiting en NGINX Ingress para evitar abusos.

3. **Optimización y ajustes finales**:
   * Frontend y Backend no se contenerizarán, solo los pods de usuario.
   * Optimiza el tiempo de inicio de los contenedores.
   * Configura un sistema de registro detallado para actividades de usuario.
   * Implementa un sistema de alertas para eventos críticos.
   * Diseña un proceso para backups regulares de la base de datos.

4. **Automatización y monitoreo**:
   * Implementa scripts para reiniciar servicios si es necesario.
   * Configura monitoreo básico del estado de los pods y servicios.
   * Crea una tarea programada para verificar saldos y detener contenedores inactivos.
   * Implementa logs centralizados para depuración y auditoría.

5. **Documentación del Proyecto Neuropod**:
   * Crea README.md completo con instrucciones de instalación y uso.
   * Documenta la arquitectura y decisiones técnicas.
   * Crea documentación para usuarios finales sobre cómo usar la plataforma.
   * Incluye guías específicas para administradores y clientes.
   * Elabora un manual de operaciones para mantenimiento y solución de problemas.

## 🎯 Mapa visual del proceso de Neuropod:

```
                           🌐 Internet
                               |
              +----------------+-----------------+
              |                                  |
       DNS Wildcard (*.neuropod.online)          |
              |                                  |
     +--------+--------+                         |
     |                 |                         |
     v                 v                         v
app.neuropod.online  api.neuropod.online  *.neuropod.online
(Frontend)           (Backend API)       (Pods de Usuario)
     |                 |                         |
     v                 v                         v
+--------------------------+ Cloudflare Tunnel +--------------------------+
|    localhost:5173        |      localhost:3000       |     localhost:443        |
+------------+-------------+-------------+-------------+-------------+-------------+
             |                           |                           |
             v                           v                           v
     +---------------+          +------------------+         +-------------------+
     | Frontend React|          | Backend Node.js  |         | NGINX Ingress     |
     | (No container)|          | (No container)   |         | Controller        |
     +-------+-------+          +--------+---------+         +---------+---------+
             |                           |                             |
             |                           v                             v
             |                  +------------------+         +-------------------+
             |                  | MongoDB          |         | Kubernetes API    |
             |                  | (No container)   |<------->| (Minikube)        |
             |                  +------------------+         +---------+---------+
             |                           ^                             |
             |                           |                             v
             |                           |                   +-------------------+
             |                  WebSocket Events             | Pods de Usuario   |
             +--------------------------------+              | - ComfyUI         |
                                             |              | - Ubuntu          |
                                             |              | - Imágenes custom |
                                             |              +-------------------+
                                             |                        |
                                             |                        v
                                             |              +-------------------+
                                             +------------->| Persistent Volume |
                                                            | (/workspace)      |
                                                            +-------------------+
```

## 🧠 Consejos para el proyecto Neuropod:

* No intentes hacerlo todo de golpe: **termina una fase antes de empezar la otra**.
* Empieza por desplegar un único contenedor y asegurarte que es accesible, después pasa a múltiples contenedores.
* La combinación **NGINX Ingress + Cloudflare Tunnel** es clave para gestionar múltiples contenedores por usuario.
* Recuerda que necesitas un DNS wildcard (`*.neuropod.online`) configurado en Cloudflare para los subdominios dinámicos.
* Define un formato estándar para los subdominios (ej: `comfy-usuario123-4567.neuropod.online`) que incluya tipo, usuario e ID único.
* Presta especial atención a la configuración del NGINX Ingress Controller y las reglas de enrutamiento dinámicas.
* Asegúrate que Cloudflare Tunnel está correctamente configurado para enrutar:
  * `app.neuropod.online` → `localhost:5173` (Frontend)
  * `api.neuropod.online` → `localhost:3000` (Backend)
  * `*.neuropod.online` → `localhost:443` (NGINX Ingress → Pods)
* El usuario administrador (lolerodiez@gmail.com) tendrá acceso especial a todas las funcionalidades.
* El sistema de saldo es crucial: asegúrate de que funciona correctamente, con 10€ para nuevos usuarios.
* El montaje de `/workspace` debe ser consistente para que los usuarios puedan guardar y recuperar sus archivos.
* La configuración de Google Cloud Console para OAuth2 puede ser complicada, tómate tiempo para hacerla correctamente.
* Si ves que algo no funciona (ej. Kubernetes, WebSocket), **sigue avanzando en otras partes** para no bloquearte. puede ser complicada, tómate tiempo para hacerla correctamente.
* Recuerda que no necesitas contenerizar frontend, backend ni MongoDB, solo los pods de usuario.
* Para las plantillas personalizadas, permite que el administrador pueda configurar la ruta `/workspace` de manera flexible.
* Si ves que algo no funciona (ej. Kubernetes, WebSocket), **sigue avanzando en otras partes** para no bloquearte.
