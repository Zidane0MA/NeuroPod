# Configuraciones extras enfocadas en mantener como servicio (No testeado)

## Configurar Cloudflared como Servicio en Windows

Para que el túnel funcione permanentemente sin necesidad de mantener una ventana de PowerShell abierta:

1. Detén el túnel que estás ejecutando manualmente presionando `Ctrl+C`.

2. Instala el servicio ejecutando PowerShell como administrador:
   ```powershell
   # Instalar el servicio
   cloudflared.exe service install

   # Iniciar el servicio
   Start-Service cloudflared

   # Configurar el servicio para que inicie automáticamente
   Set-Service -Name cloudflared -StartupType Automatic
   ```

3. Verifica que el servicio esté funcionando:
   ```powershell
   Get-Service cloudflared
   ```

4. Comprueba nuevamente los subdominios para asegurarte de que siguen funcionando correctamente.

## Configuración Avanzada y Optimización

### A. Reglas de Firewall en Cloudflare

Para proteger tus servicios, configura reglas de firewall en Cloudflare:

1. Ve a la sección "Seguridad" > "WAF" en el panel de control de Cloudflare.
2. Crea reglas personalizadas para limitar el acceso según tus necesidades.

Ejemplo de regla para proteger el panel de administración:
- Nombre: "Proteger Admin Panel"
- Si: Hostname es `app.neuropod.online` Y Ruta comienza con `/admin`
- Entonces: Desafiar (Challenge)

### B. Optimización de Caché

Para mejorar el rendimiento de archivos estáticos en el frontend:

1. Ve a la sección "Reglas" > "Page Rules" o "Reglas de página".
2. Crea una regla para almacenar en caché los recursos estáticos:
   - URL: `https://app.neuropod.online/assets/*`
   - Configuración: Cache Level = Cache Everything, Edge Cache TTL = 1 day

### C. Configurar Túnel para Alta Disponibilidad (Opcional)

Para entornos de producción críticos, puedes configurar varios replicas del túnel:

1. Ejecuta Cloudflared en varias máquinas usando el mismo archivo de configuración y credenciales.
2. O en la misma máquina, ejecuta varias instancias del servicio con diferentes configuraciones de monitoreo.

## Solución de Problemas Comunes

### A. El Túnel No Se Conecta

1. Verifica que las credenciales sean correctas:
   ```powershell
   cloudflared.exe tunnel list
   ```
2. Asegúrate de que el archivo de configuración tenga el nombre correcto del túnel.
3. Revisa los logs del servicio:
   ```powershell
   Get-EventLog -LogName Application -Source cloudflared -Newest 20
   ```
   o
   ```powershell
   # Detener el servicio
   Stop-Service cloudflared
   
   # Ejecutar en modo manual con logs detallados
   cloudflared.exe --loglevel debug tunnel run neuropod-tunnel
   ```

### B. Los Subdominios No Funcionan

1. Verifica que los registros DNS estén configurados correctamente en Cloudflare.
2. Comprueba que el proxy de Cloudflare esté activado (icono naranja).
3. Asegúrate de que los servicios locales estén funcionando en los puertos correctos.
4. Verifica que no haya reglas de bloqueo en Cloudflare.

## Seguridad Adicional

### A. Restringir Acceso por IP (Opcional)

Para permitir acceso solo desde ciertas IPs:

1. Ve a la sección "Seguridad" > "WAF" en Cloudflare.
2. Crea una regla:
   - Si: IP de origen no en lista (agrega tus IPs permitidas)
   - Entonces: Bloquear

### B. Protección DDoS

Cloudflare proporciona protección DDoS básica por defecto. Para mejorarla:

1. Ve a "Seguridad" > "Configuración de seguridad".
2. Ajusta el nivel de seguridad según tus necesidades (recomendado: Medio).

### C. Bot Management (Plan Enterprise)

Si tienes un plan Enterprise, puedes configurar Bot Management para identificar y gestionar el tráfico de bots.

## Monitorización y Mantenimiento

### A. Monitoreo del Túnel

1. Crea un script PowerShell para verificar periódicamente el estado del túnel:
   ```powershell
   # C:\scripts\check-tunnel.ps1
   $tunnelStatus = cloudflared.exe tunnel info neuropod-tunnel
   if ($tunnelStatus -like "*Active connectors: 0*") {
       Restart-Service cloudflared
       Write-Output "Túnel reiniciado a las $(Get-Date)" | Out-File -Append -FilePath "C:\logs\tunnel-restarts.log"
   }
   ```

2. Programa la ejecución periódica con el Programador de tareas de Windows.

### B. Actualizaciones de Cloudflared

Actualiza regularmente Cloudflared para aprovechar las mejoras de seguridad:

1. Descarga la última versión del instalador MSI.
2. Detén el servicio:
   ```powershell
   Stop-Service cloudflared
   ```
3. Instala la nueva versión.
4. Inicia el servicio:
   ```powershell
   Start-Service cloudflared
   ```


## Ejecutar Servicios en Segundo Plano en Windows

1. **Usando PM2 para Node.js en Windows**:

   ```powershell
   # Instalar PM2 globalmente
   npm install -g pm2
   
   # Iniciar el backend con PM2
   cd C:\path\to\backend
   pm2 start app.js --name neuropod-backend
   
   # Guardar la configuración para que se inicie al arrancar
   pm2 save
   
   # Configurar PM2 para iniciar al arrancar Windows
   pm2 startup
   # Sigue las instrucciones que se muestran
   ```

2. **Configuración de Tareas Programadas para Monitorización**:

   Crea un script PowerShell `check-api.ps1`:

   ```powershell
   # C:\scripts\check-api.ps1
   try {
       $response = Invoke-WebRequest -Uri "http://localhost:3000/api/status" -Method GET -UseBasicParsing
       if ($response.StatusCode -ne 200) {
           Write-Output "API no responde correctamente, reiniciando..."
           pm2 restart neuropod-backend
       }
   } catch {
       Write-Output "Error al conectar con la API, reiniciando..."
       pm2 restart neuropod-backend
   }
   ```

   Configurar una tarea programada:

   ```powershell
   # Crear una tarea programada (ejecutar como administrador)
   $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\scripts\check-api.ps1"
   $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10)
   $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
   $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
   Register-ScheduledTask -TaskName "NeuropodAPICheck" -Action $action -Trigger $trigger -Principal $principal -Settings $settings
   ```

## Consideraciones Específicas para Windows en Producción

3. **Logs en Windows**:
   
   Configura Winston para usar rutas de Windows:

   ```javascript
   const winston = require('winston');
   const path = require('path');
   
   // Asegúrate de que la carpeta de logs existe
   const logsDir = path.join(__dirname, 'logs');
   if (!fs.existsSync(logsDir)) {
     fs.mkdirSync(logsDir);
   }
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     defaultMeta: { service: 'neuropod-api' },
     transports: [
       new winston.transports.File({ 
         filename: path.join(logsDir, 'error.log'), 
         level: 'error' 
       }),
       new winston.transports.File({ 
         filename: path.join(logsDir, 'combined.log') 
       }),
     ]
   });
   ```