# 🛠️ Configuración ya implementada del Entorno Kubernetes (minikube)

> **Nota**: Parcialmente implementado.

## Preparación del Entorno con GPU

```bash
# Verificar que Docker tiene acceso a la GPU
docker run --rm --gpus all nvidia/cuda:12.0.1-base-ubuntu22.04 nvidia-smi

# Verificar que Docker usa el runtime de NVIDIA
docker info | Select-String "Runtimes"

# Iniciar Minikube de forma temporal
minikube start --driver=docker

# Acceder a Minikube y crear la ruta para workspace
minikube ssh
mkdir -p /mnt/data/workspace

# Habilitar el addon de Ingress
minikube addons enable ingress

# Acceso a GPU en Kubernetes:
# Necesitas instalar el device plugin de NVIDIA para Minikube:
minikube addons enable gpu
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.1/nvidia-device-plugin.yml

# Iniciar Minukibe con los addons
minikube start --driver=docker --addons=gpu,ingress
```

## Configuración de tolerancias para pods con GPU

### Modifica tus pods para incluir

```yaml
tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

## Configuración de Almacenamiento Persistente

```bash
# Configurar StorageClass
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: k8s.io/minikube-hostpath
reclaimPolicy: Retain
volumeBindingMode: Immediate
EOF

# Crear un PersistentVolume general
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: neuropod-pv-global
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /mnt/data/workspace
    type: DirectoryOrCreate
EOF
```

## Verificación de GPU en Kubernetes:

```bash
powershell
# Verificar nodos con GPU
kubectl get nodes -o json | Select-String -Pattern "nvidia.com/gpu"

# Verificar recursos disponibles
kubectl describe node minikube | Select-String -Pattern "Capacity:|Allocatable:|nvidia.com/gpu"
```

## Configuración Adicional Requerida:

```bash
# RBAC para pods con GPU
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: neuropod-gpu-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: neuropod-gpu-crb
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: ServiceAccount
  name: neuropod-gpu-sa
  namespace: default
EOF
```

## 🔄 Funcionalidades en Implementación Actual

### Gestión de Pods (`/admin/pods` y `/client/pods`)

#### Funcionalidades a Implementar

- **Listar pods**: 
  - Cliente: ve solo sus pods
  - Admin: ve sus pods o puede buscar pods por correo de usuario
- **Información por pod**:
  - Nombre, estado, GPU elegida, tiempo activo
  - Métricas: CPU, memoria, GPU (si está en ejecución)
- **Acciones**:
  - Iniciar/Detener pod (activar/desactivar en Kubernetes)
  - Eliminar pod
  - Conectar (Modal con servicios disponibles y puertos)
  - Ver logs

#### Funcionalidades a Implementar

- **Correcciones de UI**:
  - Ajustar sección GPU para vista angosta
  - Reorganizar sección de puertos y Jupyter debajo de discos
  - Actualizar limitadores: Container Disk (máx 50 GB), Volume Disk (máx 150 GB)
- **Configuración de despliegue**:
  - Selección de GPU con precios dinámicos desde backend
  - Opciones de despliegue: Template o Imagen Docker
  - Configuración de puertos y Jupyter Notebook
  - Gestión de discos
  - Cálculo dinámico de costos
- **Para admin**: campo para asignar a usuario específico

## 📋 Funcionalidades Pendientes

### Página de Configuración de Admin `/admin/settings`

- Sistema de precios de GPUs y almacenamiento
- Configuración de plantillas (templates)
- Gestión de logs y backups
- Configuración de auto-apagado de pods inactivos

### Gestión de Usuarios `/admin/users`

- Búsqueda y filtros de usuarios
- Asignación de saldo a usuarios
- Suspensión y eliminación de usuarios

### Estadísticas de Cliente `/client/stats`

- Métricas de utilización de recursos
- Gráficos de uso
- Logs del sistema

## 📝 Plan de Trabajo Recomendado

1. **Completar la gestión básica de pods**:
   - Implementar endpoints de backend para listar, iniciar, detener y eliminar pods
   - Conectar frontend con estos endpoints
   - Implementar la creación de pods y la integración con Kubernetes

2. **Implementar el despliegue de pods**:
   - Desarrollar la lógica para validar configuraciones
   - Implementar la verificación de Jupyter
   - Conectar con el sistema de plantillas y precios

3. **Configurar el sistema de ingress y acceso**:
   - Implementar la generación de URLs según entorno
   - Configurar el enrutamiento correcto de los puertos
   - Asegurar el acceso a servicios (HTTP y Jupyter)

4. **Finalizar las páginas de administración**:
   - Implementar la gestión de usuarios
   - Desarrollar la página de configuración y precios
   - Conectar con el sistema de logs

5. **Implementar estadísticas y monitorización**:
   - Desarrollar la recopilación de métricas de pods
   - Implementar la visualización de estadísticas
   - Configurar el sistema de notificaciones

## 🧩 Diagrama de Arquitectura

```
                                🌐 Internet
                                      |
                        +-------------+------------------------+
                        |                                      |
         DNS Wildcard (*.neuropod.online)                      |
                        |                                      |
            +-------------------------+                        |
            |                         |                        |
            v                         v                        v
    app.neuropod.onlin        api.neuropod.online       *.neuropod.online
        (Frontend)               (Backend API)          (Pods de Usuario)
            |                         |                        |
            v                         v                        v
+-----------------------+--- Cloudflare Tunnel ---+-------------------------+
|    localhost:5173     |     localhost:3000      |      localhost:443      |
+-----------+-----------+-------------+-----------+------------+------------+
            |                         |                        |
            v                         v                        v
    +---------------+        +------------------+    +-------------------+
    | Frontend React|        | Backend Node.js  |    | NGINX Ingress     |
    | (No container)|        | (No container)   |    | Controller        |
    +-------+-------+        +--------+---------+    +---------+---------+
            |                         |                        |
            |                         v                        v
            |                +------------------+    +-------------------+
            |                | MongoDB          |    | Kubernetes API    |
            |                | (No container)   |<-->| (Minikube)        |
            |                +------------------+    +---------+---------+
            |                         ^                        |
            |                         |                        v
            |                         |              +-------------------+
            |                 WebSocket Events       | Pods de Usuario   |
            +-------------------------+              | - ComfyUI         |
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

## 📦 Ejemplo del PVC en formato ymal para Usuario

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: comfyui-workspace-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 150Gi
```

Este plan proporciona una ruta clara para la implementación y conexión entre el frontend existente y el backend, enfocándose primero en las funcionalidades críticas y dejando para después las características secundarias.