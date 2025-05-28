# 🛠️ Configuración ya implementada del Entorno Kubernetes (minikube)

> **Nota**: Completamente implementado.

## Instalacion de programas

```powershell
# Descargar Minikube desde https://minikube.sigs.k8s.io/docs/start/
kubectl version –client

# Descargar docker-desktop desde https://www.docker.com/products/docker-desktop/
```

## Configuraciones previas

Para ajustar la memoria disponible y la cantidad de procesadores en Docker Desktop. `notepad $env:USERPROFILE\.wslconfig`. 

```bash
[wsl2]  
memory=16GB
processors=8
```
La paravirtualización de GPU en WSL2 requiere una configuración explícita. Para habilitar el acceso a la GPU, se debe crear o modificar el archivo wsl.conf

```bash
# Abrir el archivo de configuracion
notepad "\\wsl.localhost\docker-desktop\etc\wsl.conf"

# Habilitar gpu
[gpu]
enabled=true

# Reiniciar para aplicar
wsl --shutdown
```

Verificar que todo esta bien con `wsl`

## Preparación del Entorno con GPU

```powershell
# Verificar que Docker tiene acceso a la GPU
docker run --rm --gpus all nvidia/cuda:12.0.1-base-ubuntu22.04 nvidia-smi

# Verificar que Docker usa el runtime de NVIDIA
docker info | Select-String "Runtimes"

# En caso de haber iniciado un cluster mal configurado
minikube delete --all --purge

# Iniciar Minikube de forma temporal
minikube start --driver=docker --container-runtime=docker --gpus=all --memory=14000mb --cpus=8

# Reiniciar el equipo si el comando anterior se queda parado
shutdown /r

# Acceder a Minikube y crear la ruta para workspace
minikube ssh "sudo mkdir -p /mnt/data/workspace && sudo chmod 777 /mnt/data/workspace"

# Habilitar addons necesarios
minikube addons enable ingress
minikube addons enable storage-provisioner
minikube addons enable default-storageclass

# Acceso a GPU en Kubernetes:
# Necesitas instalar el device plugin de NVIDIA para Minikube:
minikube addons enable nvidia-device-plugin

## Manifiestos Kubernetes para NeuroPod
kubectl apply -f neuropod-k8s.yaml

# Iniciar Minukibe con todas las configuraciones
minikube start --driver=docker --container-runtime=docker --gpus=all --memory=14000mb --cpus=8 --addons=ingress,storage-provisioner,default-storageclass

# Verificar que Minikube está funcionando
minikube status

# Verificar que Minkube dectecta la GPU (devuelve 1)
kubectl get nodes -o jsonpath='{.items[*].status.allocatable.nvidia\.com/gpu}'
```

Cada bandera del comando de inicio tiene un propósito específico:

* --driver=docker: Esta bandera instruye a Minikube para que utilice Docker Desktop como su controlador de máquina virtual subyacente. Esta es la elección correcta para los usuarios de Windows que aprovechan la integración de WSL2 de Docker Desktop.
* --container-runtime=docker: Asegura que el tiempo de ejecución de contenedores Docker se utilice dentro del clúster de Minikube, lo que se alinea con el controlador de Docker Desktop.
* --gpus=all: Esta bandera crucial le indica a Minikube que exponga todas las GPU disponibles del entorno Docker al clúster de Kubernetes. También se puede especificar --gpus=nvidia para GPU específicas de NVIDIA, pero all suele ser suficiente.
* --memory=16000mb --cpus=8: Estas banderas asignan 16 GB de memoria y 8 núcleos de CPU a su máquina virtual de Minikube. Se pueden ajustar estos valores según las capacidades de su sistema y los requisitos de recursos de sus cargas de trabajo GPU.

## Crear certificado TLS

```powershell admin
# Instalar OpenSSL con winget
winget install ShiningLight.OpenSSL.Light

# Añadir el binario al path desde administrador
$env:Path += ";C:\Program Files\OpenSSL-Win64\bin"

# Crear archivo de configuracion openssl.conf
@"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = *.neuropod.online
CN = neuropod.online

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = *.neuropod.online
DNS.2 = neuropod.online
"@ | Out-File -FilePath "openssl.conf" -Encoding ascii

# Crear los certificados
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout tls.key -out tls.crt -config openssl.conf -extensions v3_req

# Verificar que el certificado tiene SAN
openssl x509 -in tls.crt -text -noout | findstr "Subject Alternative Name"
openssl x509 -in tls.crt -text -noout | findstr "DNS"

# Convertir los certificados a base 64
[Convert]::ToBase64String((Get-Content tls.crt -Encoding byte)) > tls.crt.base64
[Convert]::ToBase64String((Get-Content tls.key -Encoding byte)) > tls.key.base64

# Obtenerlos
Get-Content tls.crt.base64
Get-Content tls.key.base64

# Copiarlo en el secret de neuropod-k8s.yaml
  tls.crt: LS0tLS1CRUdJTi... # Base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 encoded private key

# Exponer minikube por el puerto 443 (abrir otra terminal)
minikube tunnel

# Comprobar puerto
netstat -an | findstr :443
```

## Manifiestos Kubernetes para NeuroPod (neuropod-k8s.yaml)

```yaml
# ConfigMap Neuropod - Configuración global del proyecto
apiVersion: v1
kind: ConfigMap
metadata:
  name: neuropod-config
  namespace: default
  labels:
    app: neuropod
    component: config
data:
  domain: "neuropod.online"            # Dominio base para todos los subdominios
  defaultStorageClass: "standard"      # Tipo de almacenamiento a usar por defecto
  maxPodsPerUser: "5"                  # Límite de pods por usuario
  workspacePath: "/workspace"          # Ruta del volumen persistente en contenedores
  defaultNamespace: "default"          # Namespace donde se crean los pods de usuario

---
# IngressClass Neuropod - Clase de ingress dedicada para el proyecto
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: neuropod-nginx
  labels:
    app: neuropod
    component: ingress
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: k8s.io/ingress-nginx

---
# ConfigMap NGINX - Configuración específica para NGINX Ingress Controller
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
  labels:
    app: neuropod
    component: nginx-config
data:
  # Permite manejar nombres de servidor largos (subdominios dinámicos)
  server-name-hash-bucket-size: "256"
  # Mejora el manejo de cabeceras HTTP grandes (tokens, etc.)
  proxy-buffer-size: "16k"
  # Importante para trabajar con Cloudflare Tunnel
  use-forwarded-headers: "true"
  # Configuración para WebSockets (Jupyter Lab)
  proxy-read-timeout: "3600"
  proxy-send-timeout: "3600"
  # Configuración adicional para mejor rendimiento
  worker-processes: "auto"
  max-worker-connections: "16384"
  # SSL y seguridad
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-ciphers: "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"

---
# Storage Class - Clase de almacenamiento para volúmenes persistentes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  labels:
    app: neuropod
    component: storage
provisioner: k8s.io/minikube-hostpath
reclaimPolicy: Retain              # Mantener datos al eliminar PVC
volumeBindingMode: Immediate       # Asignar volumen inmediatamente
allowVolumeExpansion: true         # Permitir expansión de volúmenes
parameters:
  type: "hostPath"

---
# Persistent Volume Global - Volumen base para todos los workspaces de usuario
apiVersion: v1
kind: PersistentVolume
metadata:
  name: neuropod-pv-global
  labels:
    app: neuropod
    component: storage
    type: workspace
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteMany                # Permite acceso desde múltiples pods
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /mnt/data/workspace      # Ruta en el host (nodo de Minikube)
    type: DirectoryOrCreate        # Crear directorio si no existe

---
# Service Account para pods con GPU
apiVersion: v1
kind: ServiceAccount
metadata:
  name: neuropod-gpu-sa
  namespace: default
  labels:
    app: neuropod
    component: rbac
    feature: gpu

---
# ClusterRoleBinding para pods con GPU
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: neuropod-gpu-crb
  labels:
    app: neuropod
    component: rbac
    feature: gpu
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit                       # Rol predefinido con permisos de edición
subjects:
- kind: ServiceAccount
  name: neuropod-gpu-sa
  namespace: default

---
# Namespace adicional para recursos de sistema (opcional)
apiVersion: v1
kind: Namespace
metadata:
  name: neuropod-system
  labels:
    app: neuropod
    component: system

---
# NetworkPolicy - Aislamiento de red entre pods de diferentes usuarios
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: neuropod-isolation
  namespace: default
  labels:
    app: neuropod
    component: security
spec:
  podSelector:
    matchLabels:
      app: neuropod-user-pod
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Permitir tráfico desde NGINX Ingress
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  # Permitir tráfico interno del mismo usuario
  - from:
    - podSelector:
        matchLabels:
          neuropod-user: "same-user"
  egress:
  # Permitir todo el tráfico saliente (Internet, DNS, etc.)
  - {}

---
# Secret para certificados TLS ( para comunicación interna)
apiVersion: v1
kind: Secret
metadata:
  name: neuropod-tls
  namespace: default
  labels:
    app: neuropod
    component: security
type: kubernetes.io/tls
data:
  # Estos valores serían generados con:
  # openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  #    -keyout tls.key -out tls.crt -config openssl.conf -extensions v3_req
  # kubectl create secret tls neuropod-tls --key tls.key --cert tls.crt --dry-run=client -o yaml
  tls.crt: LS0tLS1CRUdJTi... # Base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 encoded private key

---
# ConfigMap para scripts de inicialización (helpers)
apiVersion: v1
kind: ConfigMap
metadata:
  name: neuropod-scripts
  namespace: default
  labels:
    app: neuropod
    component: scripts
data:
  install-jupyter.sh: |
    #!/bin/bash
    # Script para instalar Jupyter Lab en contenedores que no lo tienen
    echo "Instalando Jupyter Lab..."
    pip install jupyterlab
    echo "Jupyter Lab instalado correctamente"
  
  setup-workspace.sh: |
    #!/bin/bash
    # Script para configurar el workspace inicial
    mkdir -p /workspace/notebooks
    mkdir -p /workspace/data
    mkdir -p /workspace/models
    echo "Workspace configurado"
    
  health-check.sh: |
    #!/bin/bash
    # Script básico de health check
    curl -f http://localhost:$1/health || exit 1
```
Se guarda bajo el nombre neuropod-k8s.yaml y se aplica con:

```bash
kubectl apply -f neuropod-k8s.yaml
```

## Verificacion del entorno

```powershell
# Ver puertos asignados
kubectl get service -n ingress-nginx ingress-nginx-controller

# Ver estado de todos los pods
kubectl get pods -n default -o wide 

# Verificar que todo se aplicó correctamente
kubectl get configmaps
kubectl get storageclass
kubectl get pv
kubectl get serviceaccount neuropod-gpu-sa
kubectl get clusterrolebinding neuropod-gpu-crb

# Verificar NGINX Ingress Controller
kubectl get pods -n ingress-nginx
kubectl get configmap nginx-configuration -n ingress-nginx

# Crear certificado TLS si no se incluye en el archivo
## (Ejecutar solo si no tienes el certificado en el manifest)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout tls.key -out tls.crt -config openssl.conf -extensions v3_req
kubectl create secret tls neuropod-tls --key tls.key --cert tls.crt

# Verificar configuración final
kubectl get all --selector=app=neuropod
kubectl describe ingressclass neuropod-nginx

# (Opcional) Ver logs de NGINX para debugging
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## 🧩 Diagrama de Arquitectura

```
                               🌐 Internet
                                      |
            +-------------------------+------------------------+
            |                         |                        |
            v                         v                        v
  app.neuropod.online       api.neuropod.online   Wildcard (*.neuropod.online)
      (Frontend)               (Backend API)           (Pods de Usuario)
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