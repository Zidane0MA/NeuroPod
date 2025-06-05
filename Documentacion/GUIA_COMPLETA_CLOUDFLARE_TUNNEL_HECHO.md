# Guía Detallada: Configuración de Cloudflare y Cloudflare Tunnel para Neuropod

Esta guía te ayudará a configurar Cloudflare para tu dominio existente en Hostinger y a establecer un Cloudflare Tunnel para exponer tus servicios locales (frontend, backend y pods de Kubernetes) a Internet de forma segura.

## 1. Transferir la Gestión DNS a Cloudflare

### 1.1. Crear una Cuenta en Cloudflare

1. Ve a [Cloudflare.com](https://www.cloudflare.com/) y regístrate o inicia sesión.
2. Haz clic en "Agregar un sitio" o "Add a site" en el panel de control.
3. Ingresa tu dominio (por ejemplo, `neuropod.online`) y haz clic en "Agregar sitio".
4. Selecciona el plan gratuito (es suficiente para nuestras necesidades).

### 1.2. Configurar los Servidores DNS en Hostinger

1. Cloudflare te mostrará los servidores DNS que debes configurar en Hostinger. Normalmente son dos, como:
   - `brad.ns.cloudflare.com`
   - `ella.ns.cloudflare.com`

2. Inicia sesión en tu cuenta de Hostinger.
3. Ve a la sección "Dominios" y selecciona tu dominio.
4. Busca la opción "Servidores de nombres" o "Nameservers".
5. Reemplaza los servidores de nombres actuales por los proporcionados por Cloudflare.
6. Guarda los cambios.

> **Nota**: La propagación DNS puede tardar entre 24-48 horas. Durante este tiempo, Cloudflare mostrará un estado "Pendiente" para tu dominio.

### 1.3. Completar la Configuración en Cloudflare

1. Vuelve a Cloudflare y haz clic en "Verificar servidores de nombres" o "Check nameservers".
2. Cloudflare escaneará tus registros DNS existentes e importará los registros más importantes.
3. Revisa los registros importados y haz clic en "Continuar".
4. En la sección "Configuración rápida", elige:
   - SSL/TLS: Completo (Para manejar certificados propios pero no utiliza un certificado válido y de confianza pública)

5. Haz clic en "Guardar" o "Save" para finalizar la configuración inicial.

## 2. Configurar los Registros DNS para Neuropod

### 2.1. Crear Registros DNS Básicos

1. Ve a la sección "DNS" en el panel de control de Cloudflare.
2. Agrega los siguientes registros:

   **Registro para API:**
   - Tipo: CNAME
   - Nombre: api
   - Destino: (se completará después con el ID del túnel)
   - Proxy status: Activado (Proxied)
   - TTL: Auto

   **Registro para App (Frontend):**
   - Tipo: CNAME
   - Nombre: app
   - Destino: (se completará después con el ID del túnel)
   - Proxy status: Activado (Proxied)
   - TTL: Auto

   **Registro Wildcard para Pods:**
   - Tipo: CNAME
   - Nombre: *
   - Destino: (se completará después con el ID del túnel)
   - Proxy status: Activado (Proxied)
   - TTL: Auto

   > **Nota**: Deja estos registros configurados temporalmente con un destino como `example.com` o el dominio actual. Actualizaremos los destinos correctos después de configurar el túnel.

### 2.2. Crear Reglas y Registros de Redirección

1. **Crear registro A para el dominio raíz**
   - Tipo: A
   - Nombre: neuropod.online (o simplemente @)
   - IPv4 address: 192.0.2.1 (IP placeholder de documentación RFC 3330)
   - Proxy status: 🟠 Activado (Proxied)
   - TTL: Auto
2. **Crear Page Rule para redirección**
   - Ve a **Cloudflare Dashboard** → **Rules** → **Page Rules**
   - **Click "Create Page Rule"**
   - Configurar:
     - **URL pattern:** `neuropod.online/*`
     - **Setting:** "Forwarding URL"
     - **Status Code:** "301 - Permanent Redirect"
     - **Destination URL:** `https://app.neuropod.online/$1`
   - **Click "Save and Deploy"**

3. **Crear registro A para WWW**
   - Tipo: A
   - Nombre: www
   - IPv4 address: 192.0.2.1 (IP placeholder de documentación RFC 3330)
   - Proxy status: 🟠 Activado (Proxied)
   - TTL: Auto

4. **Crear Page Rule para WWW**
   - Ve a **Cloudflare Dashboard** → **Rules** → **Page Rules**
   - **Click "Create Page Rule"**
   - Configurar:
     - **URL pattern:** `www.neuropod.online/*`
     - **Setting:** "Forwarding URL"
     - **Status Code:** "301 - Permanent Redirect"
     - **Destination URL:** `https://app.neuropod.online/$1`
   - **Click "Save and Deploy"**

### 2.3 **Configuración Final Esperada:**

```
DNS Records:
✅ A    neuropod.online → 192.0.2.1 (🟠 Proxied)
✅ A    www             → 192.0.2.1 (🟠 Proxied)
✅ CNAME api            → 54d974e5-...cfargotunnel.com (🟠 Proxied)
✅ CNAME app            → 54d974e5-...cfargotunnel.com (🟠 Proxied)  
✅ CNAME *              → 54d974e5-...cfargotunnel.com (🟠 Proxied)

Page Rules:
✅ neuropod.online/*     → https://app.neuropod.online/$1 (301)
✅ www.neuropod.online/* → https://app.neuropod.online/$1 (301)
```

#### **¿Por qué esta configuración funciona?**

1. **Registro A con IP placeholder:** `192.0.2.1` es una IP de documentación que nunca se usa en producción
2. **Proxy activado:** Cloudflare intercepta todo el tráfico a `neuropod.online`
3. **Page Rule:** Captura las requests y las redirige automáticamente a `app.neuropod.online`
4. **El usuario nunca llega** a la IP `192.0.2.1` porque Cloudflare procesa la redirección primero
5. **CNAME para www:** Permite que `www.neuropod.online` también redirija correctamente a la aplicación

## 3. Configurar Cloudflare Tunnel en Windows

### 3.1. Instalar Cloudflared en Windows

1. Descarga cloudflare con winget
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Ejecuta el instalador y sigue las instrucciones.
3. Verifica la instalación abriendo PowerShell y ejecutando:
   ```powershell
   cloudflared.exe --version
   ```

### 3.2. Autenticar Cloudflared

1. Abre PowerShell como administrador y ejecuta:
   ```powershell
   cloudflared.exe tunnel login
   ```
2. Se abrirá una ventana del navegador solicitando autorización. Inicia sesión en tu cuenta de Cloudflare.
3. Selecciona el dominio que configuraste anteriormente (`neuropod.online`).
4. Confirma los permisos solicitados haciendo clic en "Autorizar".
5. Cierra la ventana del navegador y vuelve a PowerShell. Deberías ver un mensaje indicando que la autenticación fue exitosa.

### 3.3. Crear un Túnel

1. En PowerShell, ejecuta:
   ```powershell
   cloudflared.exe tunnel create neuropod-tunnel
   ```
2. Cloudflared creará un túnel y generará un archivo JSON con credenciales. Toma nota de la ubicación de este archivo (por defecto: `C:\Users\<tu-usuario>\.cloudflared\<UUID>.json`).
3. También toma nota del UUID del túnel mostrado en la terminal, lo necesitarás más adelante.

### 3.4. Crear el Archivo de Configuración

1. Crea una carpeta para la configuración de Cloudflared si no existe:
   ```powershell
   mkdir -Force $env:USERPROFILE\.cloudflared
   ```

2. Crea un archivo de configuración usando Notepad o cualquier editor de texto:
   ```powershell
   notepad $env:USERPROFILE\.cloudflared\config.yml
   ```

3. Agrega la siguiente configuración (reemplaza los valores según sea necesario):
      ```yaml
      # ~/.cloudflared/config.yml (Windows: %USERPROFILE%\.cloudflared\config.yml)
      tunnel: neuropod-tunnel
      credentials-file: C:\Users\<tu-usuario>\.cloudflared\neuropod-tunnel.json

      ingress:
      # Frontend React
      - hostname: app.neuropod.online
         service: http://localhost:5173
      
      # Backend API
      - hostname: api.neuropod.online
         service: http://localhost:3000
      
      # Wildcard para los pods de usuario - CONFIGURACIÓN MEJORADA
      - hostname: "*.neuropod.online"
         service: https://localhost:443
         originRequest:
            noTLSVerify: true
            # Configuración importante para WebSockets (Jupyter Lab)
            connectTimeout: 30s
            tlsTimeout: 30s
            tcpKeepAlive: 30s
            disableChunkedEncoding: true # Ayuda con ciertos problemas WebSocket
            # Configuración para tokens de acceso y Jupyter Lab
            http2Origin: false

      # Fallback
      - service: http_status:404
      ```
      
   > **Nota**: Los puertos especificados (5173, 3000, 443) deben coincidir con los puertos donde se ejecutan tus servicios localmente.

### 3.5. Ejecutar el Túnel Manualmente (Prueba)

1. En PowerShell, ejecuta:
   ```powershell
   cloudflared.exe tunnel run neuropod-tunnel
   ```
2. Verifica que no haya errores y que el túnel se inicie correctamente.
3. Mantén esta ventana abierta para las pruebas iniciales.

## 4. Actualizar Registros DNS con el ID del Túnel

1. Copia el UUID de tu túnel (visible en la salida de los comandos anteriores o mediante `cloudflared.exe tunnel list`).
2. Regresa al panel de control de Cloudflare, sección "DNS".
3. Edita los registros CNAME que creaste anteriormente:

   **Registro para API:**
   - Destino: `<UUID>.cfargotunnel.com`

   **Registro para App (Frontend):**
   - Destino: `<UUID>.cfargotunnel.com`

   **Registro Wildcard para Pods:**
   - Destino: `<UUID>.cfargotunnel.com`

4. Guarda los cambios.

## 5. Probar la Configuración

1. Asegúrate de que tus servicios locales estén en funcionamiento:
   - Frontend (puerto 5173)
   - Backend (puerto 3000)
   - Minikube con NGINX Ingress (puerto 443)

2. Abre un navegador e intenta acceder a:
   - `https://app.neuropod.online` (debería mostrar tu frontend)
   - `https://api.neuropod.online/status/public` (o cualquier endpoint disponible para verificar el backend)

3. Si todo funciona correctamente, ¡felicidades! Tu configuración básica está completa.

## 6. Firewall de Windows:
   
   Asegúrate de que los puertos necesarios estén abiertos:

   ```powershell
   # Abrir puerto para el backend (ejecutar como administrador)
   New-NetFirewallRule -DisplayName "Neuropod Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   
   # Abrir puerto para el frontend
   New-NetFirewallRule -DisplayName "Neuropod Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
   
   # Abrir puerto para NGINX Ingress
   New-NetFirewallRule -DisplayName "Neuropod Ingress" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
   ```

## Conclusión

Con esta configuración, tendrás un sistema completo donde:

- Tu dominio existente está siendo gestionado por Cloudflare
- Cloudflare Tunnel expone de forma segura tus servicios locales a Internet
- Los servicios principales son accesibles a través de subdominios dedicados (app.neuropod.online, api.neuropod.online)
- Cada pod de usuario obtiene su propio subdominio único (*.neuropod.online)
- Todo el tráfico está protegido con HTTPS

Esta configuración proporciona seguridad, escalabilidad y facilidad de uso para tu plataforma Neuropod, sin necesidad de abrir puertos en tu red local o configurar IP pública estática.