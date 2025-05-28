## 6. Configurar Cloudflared como Servicio en Windows

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

## 7. Configuración Avanzada y Optimización

### 7.1. Reglas de Firewall en Cloudflare

Para proteger tus servicios, configura reglas de firewall en Cloudflare:

1. Ve a la sección "Seguridad" > "WAF" en el panel de control de Cloudflare.
2. Crea reglas personalizadas para limitar el acceso según tus necesidades.

Ejemplo de regla para proteger el panel de administración:
- Nombre: "Proteger Admin Panel"
- Si: Hostname es `app.neuropod.online` Y Ruta comienza con `/admin`
- Entonces: Desafiar (Challenge)

### 7.2. Optimización de Caché

Para mejorar el rendimiento de archivos estáticos en el frontend:

1. Ve a la sección "Reglas" > "Page Rules" o "Reglas de página".
2. Crea una regla para almacenar en caché los recursos estáticos:
   - URL: `https://app.neuropod.online/assets/*`
   - Configuración: Cache Level = Cache Everything, Edge Cache TTL = 1 day

### 7.3. Configurar Túnel para Alta Disponibilidad (Opcional)

Para entornos de producción críticos, puedes configurar varios replicas del túnel:

1. Ejecuta Cloudflared en varias máquinas usando el mismo archivo de configuración y credenciales.
2. O en la misma máquina, ejecuta varias instancias del servicio con diferentes configuraciones de monitoreo.

## 8. Solución de Problemas Comunes

### 8.1. El Túnel No Se Conecta

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

### 8.2. Los Subdominios No Funcionan

1. Verifica que los registros DNS estén configurados correctamente en Cloudflare.
2. Comprueba que el proxy de Cloudflare esté activado (icono naranja).
3. Asegúrate de que los servicios locales estén funcionando en los puertos correctos.
4. Verifica que no haya reglas de bloqueo en Cloudflare.

## 9. Seguridad Adicional

### 9.1. Restringir Acceso por IP (Opcional)

Para permitir acceso solo desde ciertas IPs:

1. Ve a la sección "Seguridad" > "WAF" en Cloudflare.
2. Crea una regla:
   - Si: IP de origen no en lista (agrega tus IPs permitidas)
   - Entonces: Bloquear

### 9.2. Protección DDoS

Cloudflare proporciona protección DDoS básica por defecto. Para mejorarla:

1. Ve a "Seguridad" > "Configuración de seguridad".
2. Ajusta el nivel de seguridad según tus necesidades (recomendado: Medio).

### 9.3. Bot Management (Plan Enterprise)

Si tienes un plan Enterprise, puedes configurar Bot Management para identificar y gestionar el tráfico de bots.

## 10. Monitorización y Mantenimiento

### 10.1. Monitoreo del Túnel

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

### 10.2. Actualizaciones de Cloudflared

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