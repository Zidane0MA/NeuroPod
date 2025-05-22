## 🚀 Configuración para Entorno de Producción en Windows

### Configuración de Dominios y DNS

1. **Configuración en Cloudflare**:
   - Registrar el dominio principal `neuropod.online` en Cloudflare
   - Configurar registros DNS wildcard para poder manejar subdominios dinámicos:
     ```
     Tipo: CNAME
     Nombre: *
     Destino: [ID del túnel].cfargotunnel.com
     Proxy: Activado (para aprovechar seguridad de Cloudflare)
     ```
   - Configurar registros específicos para frontend y backend:
     ```
     Tipo: CNAME
     Nombre: app
     Destino: [ID del túnel].cfargotunnel.com
     
     Tipo: CNAME
     Nombre: api
     Destino: [ID del túnel].cfargotunnel.com
     ```

2. **Configuración de Cloudflare Tunnel para Windows**:

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
        service: http://localhost:443
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

3. **Instalación y Configuración de Cloudflared en Windows**:
   ```powershell
   # Descargar e instalar cloudflared para Windows
   # Desde: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi

   # Configurar como servicio de Windows (ejecutar PowerShell como administrador)
   # Primero, autenticarse
   cloudflared.exe tunnel login

   # Crear un tunnel
   cloudflared.exe tunnel create neuropod-tunnel

   # Crear la ruta del directorio de configuración si no existe
   mkdir -Force $env:USERPROFILE\.cloudflared

   # Instalar como servicio de Windows
   cloudflared.exe service install

   # Iniciar el servicio
   Start-Service cloudflared

   # Verificar que el servicio esté ejecutándose
   Get-Service cloudflared
   ```

### Configuración de NGINX Ingress en Minikube (Windows)

1. **Certificados TLS dentro del clúster**:
   
   Aunque Cloudflare maneja HTTPS externamente, es recomendable tener TLS dentro del clúster:

   ```powershell
   # Instalar OpenSSL si no lo tienes (puedes usar Chocolatey)
   # choco install openssl

   # Crear un certificado autofirmado para comunicación interna
   # Ejecutar en PowerShell:
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
     -keyout tls.key -out tls.crt -subj "/CN=*.neuropod.local"
   
   # Crear un secret de Kubernetes con el certificado
   kubectl create secret tls neuropod-tls --key tls.key --cert tls.crt
   ```

2. **Configuración NGINX Ingress Controller**

    Las configuraciones de NGINX son cruciales para el funcionamiento correcto del sistema:

    ```yaml
    # ConfigMap para NGINX
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: nginx-configuration
      namespace: ingress-nginx
    data:
      server-name-hash-bucket-size: "256"  # Permite manejar nombres de servidor (subdominios) largos
      proxy-buffer-size: "16k"             # Mejora el manejo de cabeceras HTTP grandes
      use-forwarded-headers: "true"        # Importante para trabajar con Cloudflare Tunnel
    ```

    Luego aplica la configuración:

    ```powershell
    # Aplicar la configuración
    kubectl apply -f ConfigMap.yaml
    ```

    **Explicación:**
    - ``server-name-hash-bucket-size``: Permite manejar subdominios largos como los que generarás (ej: mi-pod-test-u1a2b3c4-8888.neuropod.online)
    - ``proxy-buffer-size``: Necesario para cabeceras HTTP más grandes, que son comunes cuando se trabaja con tokens de autenticación
    - ``use-forwarded-headers``: Asegura que las peticiones mantengan su origen cuando pasan por Cloudflare Tunnel

3. Kubernetes ConfigMap para Neuropod

    ```yaml
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: neuropod-config
    data:
      domain: "neuropod.online"            # Dominio base para todos los subdominios
      defaultStorageClass: "standard"      # Tipo de almacenamiento a usar por defecto
      maxPodsPerUser: "5"                  # Límite de pods por usuario
    ```

    Luego aplica la configuración:

    ```powershell
    # Aplicar la configuración
    kubectl apply -f ConfigMap.yaml
    ```

3. **Clase de Ingress dedicada**:

   Crea un archivo llamado `ingress-class.yaml`:

   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: IngressClass
   metadata:
     name: neuropod-nginx
     annotations:
       ingressclass.kubernetes.io/is-default-class: "true"
   spec:
     controller: k8s.io/ingress-nginx
   ```

   Aplica la configuración:

   ```powershell
   kubectl apply -f ingress-class.yaml
   ```

### Consideraciones Específicas para Windows en Producción

1. **Permisos y Rutas**:
   
   - Utiliza siempre rutas completas con `C:\path\to\file` en lugar de rutas relativas.
   - Asegúrate de ejecutar los servicios críticos como administrador.
   - Para evitar problemas con barras diagonales en configuraciones, usa doble barra invertida `\\` o barras diagonales normales `/` incluso en Windows.

2. **Firewall de Windows**:
   
   Asegúrate de que los puertos necesarios estén abiertos:

   ```powershell
   # Abrir puerto para el backend (ejecutar como administrador)
   New-NetFirewallRule -DisplayName "Neuropod Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   
   # Abrir puerto para el frontend
   New-NetFirewallRule -DisplayName "Neuropod Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
   
   # Abrir puerto para NGINX Ingress
   New-NetFirewallRule -DisplayName "Neuropod Ingress" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
   ```

4. **Problemas Comunes y Soluciones en Windows**:

   - **Error de conexión rechazada a MongoDB**:
     - Verifica que MongoDB se esté ejecutando como servicio de Windows
     - Asegúrate de que el firewall permite conexiones a MongoDB (puerto 27017)
   
   - **El túnel de Cloudflare no funciona**:
     - Verifica que el servicio cloudflared está ejecutándose
     - Comprueba que las rutas en el archivo de configuración usan la sintaxis correcta de Windows
   
   - **Pods no accesibles a través de subdominios**:
     - Verifica que Minikube está en ejecución (`minikube status`)
     - Comprueba que el addon de ingress está habilitado (`minikube addons list`)
     - Asegúrate de que la configuración de Cloudflare Tunnel apunta al puerto correcto del NGINX Ingress