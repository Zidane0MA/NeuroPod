## 📋 Información del Proyecto

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Zidane0MA/NeuroPod)

**Nombre del Proyecto**: Neuropod  
**Dominio**: neuropod.online  
**Objetivo**: Plataforma para gestionar y ejecutar pods a través de una interfaz web con autenticación de usuarios. ComfyUI está disponible como una plantilla predefinida, al igual que Ubuntu, pero cualquier imagen Docker podrá ejecutarse manualmente.   
**Tecnologías principales**: MongoDB, Node.js, React, Kubernetes, Minikube, Docker, NGINX Ingress, Cloudflare Tunnel.
**Base de datos**: `plataforma` (gestionada con mongosh)  
**Modelo de negocio**: Los usuarios tienen un saldo inicial de 10€, que gastan al ejecutar contenedores. El administrador tiene saldo infinito y puede configurar precios así como asignar saldo a los usuarios, no está implementado un sistema de pago.  

Neuropod es una plataforma que permitirá a los usuarios iniciar sesión, gestionar y ejecutar múltiples contenedores Docker a través de una interfaz web intuitiva. Cada contenedor será accesible mediante su propio subdominio dinámico (ej. `https://pt-a455c995-8188-26ecc67d.neuropod.online/`). El sistema gestionará la autenticación, sesiones, y desplegará los contenedores necesarios en Kubernetes de forma dinámica según las peticiones de los usuarios. Los contenedores tendrán un directorio `/workspace` que persistirá entre sesiones para almacenar datos del usuario.

## 🌐 Dominio

**Sitio principal**: [https://neuropod.online](https://neuropod.online)  
**Frontend**: `https://app.neuropod.online`  
**Backend API**: `https://api.neuropod.online`  
**Contenedores dinámicos**: `https://<subdominio>.neuropod.online`

---

## 🚀 Características principales

- Autenticación con Google OAuth2
- Backend Node.js (no contenerizado)
- Frontend React (no contenerizado)
- MongoDB local para persistencia
- Ejecución dinámica de Pods en Kubernetes (Minikube)
- NGINX Ingress Controller para enrutar subdominios únicos
- Exposición segura con Cloudflare Tunnel
- Gestión de saldo por usuario y facturación por uso
- WebSockets en tiempo real para estado y saldo

---

## 📦 Tecnologías utilizadas

- Node.js + Express
- React
- MongoDB + Mongoose
- Kubernetes (Minikube)
- Docker
- NGINX Ingress Controller
- Cloudflare Tunnel
- @kubernetes/client-node
- WebSockets
- OAuth2 (Google)
- OpenSSL

---

## 🧱 Arquitectura

```
Cloudflare (HTTPS) → Tunnel (HTTPS) → NGINX (termina TLS) → pod (HTTP)
```

````mermaid
flowchart LR
 subgraph Internet["Internet"]
        A1["🌐 Internet"]
        A3["app.neuropod.online<br>(Frontend)"]
        A4["api.neuropod.online<br>(Backend API)"]
        A5["*.neuropod.online<br>(Pods de Usuario)"]
  end
 subgraph subGraph1["Cloudflare Tunnel"]
        B1["localhost:5173"]
        B2["localhost:3000"]
        B3["localhost:443"]
  end
    A1 --> A3 & A4
    A1 -- DNS Wildcard --> A5
    A3 --> B1
    A4 --> B2
    A5 --> B3
    B1 --> C1["Frontend React<br>(No container)"]
    B2 --> C2["Backend Node.js<br>(No container)"]
    B3 --> C3["NGINX Ingress<br>Controller"]
    C1 -- REST API --> C2
    C2 -- "REST (client-node)" --> E1["Kubernetes API<br>(Minikube)"]
    C2 --> D1["MongoDB<br>(No container)"]
    C3 --> E1
    E1 --> F1["Pods de Usuario:<br>- ComfyUI<br>- Ubuntu<br>- Imágenes custom"]
    F1 --> G1["Persistent Volume<br>(/workspace)"]
    C2 -. WebSocket Events .-> F1
````
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

---

## 🛠️ Instalación local

1. Instalar node.js
    ```powershell
    # Opcion 1: Instalar fnm (Gestor de versiones de node.js)
    # Ejecutar PowerShell como administrador y cambiar politica
    Set-ExecutionPolicy RemoteSigned

    # Crear archivo Microsoft.PowerShell_profile.ps1 en ruta $PROFILE
    notepad $PROFILE
    # Ingresa:
      fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression 

    # Instalación fnm (Powershell)
    winget install Schniz.fnm
    fnm install 22   
    fnm use 22

    # Verificar instalaciones (en PowerShell)
    node --version
    npm --version

    # Opcion 2: Instalar Node.js desde el instalador oficial
    # Descarga desde https://nodejs.org/en/download/

    # Instalar MongoDB Community Edition para Windows
    # Descarga desde https://www.mongodb.com/try/download/community
    # MongoDB debe estar disponible en C:\Program Files\MongoDB\Server\[versión]\bin\mongod.exe
    ```

2. Completar las configuraciones de las guias.
   > **Nota**: Ver archivo [`Guia Cloudflare`](./Documentacion/GUIA_COMPLETA_CLOUDFLARE_TUNNEL_HECHO.md) y [`Guia Minikube`](./Documentacion/GUIA_MINIKUBE_CONFIGURACION_HECHO.md).

3. Configurar [Google Cloud Console](https://console.cloud.google.com)
   ```md
   ### 1. Acceder a Google Cloud Console
   Crear un proyecto en Google Cloud Console, en la sección **APIs y servicios > Credenciales**.
 
   ### 2. Crear una credencial OAuth
   Seleccionar **Crear credencial** y elegir **ID de cliente OAuth**.

   ### 3. Configurar la pantalla de consentimiento
   - Definir el tipo de usuario como **Externo**.

   ### 4. Crear la credencial OAuth
   - Seleccionar **Aplicación Web** como tipo de aplicación.
   - Asignar el nombre **NeuroPod Web Client**.
   - Especificar los **Orígenes JavaScript autorizados**:
     - http://localhost:5173
     - https://app.neuropod.online
   - Definir las **URLs de redirección autorizadas**:
     - http://localhost:5173
     - http://localhost:5173/login
     - https://app.neuropod.online
     - https://app.neuropod.online/login

   ### 5. Agregar usuarios de prueba
   - Ve a **Público** y añade los usuarios de prueba.

   ### 6. Obtener credenciales
   - **ID CLIENTE**
   - **SECRETO DE CLIENTE**
   ```

4. Iniciar los servicios con el script [Arrancar.ps1](./Arrancar.ps1).

5. En caso de detener todo usar el script [Detener.ps1](Detener.bat)

---

## 📁 Estructura del proyecto

```
/NeuroPod
  ├── Arrancar.bat
  ├── Detener.bat
  ├── LICENSE
  ├── Neuropod_Tecnologias.docx
  ├── README.md
  ├── Documentacion/
  ├── Kubernetes/
  ├── Neuropod-Backend
  │   ├── src/
  │   └── package.json
  └── Neuropod-Frontend
      ├── src/
      ├── public/
      └── package.json
```

---

## 🧑‍⚖️ Licencia

Este proyecto está licenciado bajo la **Apache License 2.0**.  
Ver archivo [`LICENSE`](./LICENSE) para más detalles.
---

## ✉️ Autor

Proyecto desarrollado por **Marvin Zidane** como parte de su entorno de prácticas técnicas.

---
