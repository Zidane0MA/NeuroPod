# ===============================
# Script para Detener Servicios NeuroPod
# ===============================

# ===============================
# Verificación de permisos
# ===============================
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Asegúrate de ejecutar este script como ADMINISTRADOR." -ForegroundColor Red
    Write-Host "Presiona cualquier tecla para continuar..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🛑 Deteniendo Servicios NeuroPod" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan

# ===============================
# Función para detener procesos
# ===============================
function Stop-ProcessSafely {
    param(
        [string]$ProcessName,
        [string]$DisplayName,
        [string]$WindowTitle = $null
    )
    
    Write-Host "Deteniendo $DisplayName..." -ForegroundColor Yellow
    
    try {
        if ($WindowTitle) {
            # Buscar por título de ventana específico
            $processes = Get-Process | Where-Object { $_.ProcessName -eq $ProcessName -and $_.MainWindowTitle -like "*$WindowTitle*" }
        } else {
            # Buscar por nombre de proceso
            $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
        }
        
        if ($processes) {
            $processes | Stop-Process -Force
            Write-Host "✅ $DisplayName detenido correctamente." -ForegroundColor Green
        } else {
            Write-Host "ℹ️ $DisplayName no estaba en ejecución o ya fue detenido." -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️ $DisplayName no estaba en ejecución o ya fue detenido." -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 1
}

# ===============================
# Función para ejecutar comandos
# ===============================
function Invoke-CommandSafely {
    param(
        [string]$Command,
        [string]$DisplayName
    )
    
    Write-Host "Ejecutando: $DisplayName..." -ForegroundColor Yellow
    
    try {
        $result = Invoke-Expression $Command 2>$null
        if ($LASTEXITCODE -eq 0 -or $result) {
            Write-Host "✅ $DisplayName ejecutado correctamente." -ForegroundColor Green
        } else {
            Write-Host "ℹ️ $DisplayName: Sin cambios o ya estaba detenido." -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️ Error al ejecutar $DisplayName" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 1
}

# ===============================
# Detener Backend y Frontend Node.js
# ===============================
Stop-ProcessSafely -ProcessName "node" -DisplayName "Backend NeuroPod" -WindowTitle "Backend"
Stop-ProcessSafely -ProcessName "node" -DisplayName "Frontend NeuroPod" -WindowTitle "Frontend"

# También detener todos los procesos node.js que puedan estar corriendo NeuroPod
Write-Host "Deteniendo todos los procesos Node.js..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | ForEach-Object {
            try {
                # Intentar obtener información del proceso para verificar si es de NeuroPod
                $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
                if ($commandLine -like "*NeuroPod*" -or $commandLine -like "*npm*") {
                    $_.Kill()
                    Write-Host "  ✅ Proceso Node.js detenido (PID: $($_.Id))" -ForegroundColor Green
                }
            } catch {
                # Ignorar errores al verificar procesos específicos
            }
        }
    } else {
        Write-Host "ℹ️ No se encontraron procesos Node.js activos." -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Error al detener procesos Node.js" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# ===============================
# Detener Minikube Tunnel
# ===============================
Stop-ProcessSafely -ProcessName "minikube" -DisplayName "Minikube Tunnel"

# ===============================
# Detener Minikube
# ===============================
Write-Host "Deteniendo Minikube..." -ForegroundColor Yellow
try {
    $minikubeStatus = & minikube status --format "{{.Host}}" 2>$null
    if ($minikubeStatus -eq "Running") {
        & minikube stop
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Minikube detenido correctamente." -ForegroundColor Green
        } else {
            Write-Host "⚠️ Hubo un problema al detener Minikube." -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️ Minikube no estaba en ejecución o ya fue detenido." -ForegroundColor Gray
    }
} catch {
    Write-Host "ℹ️ Minikube no estaba en ejecución o ya fue detenido." -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# ===============================
# Detener Cloudflare Tunnel
# ===============================
Stop-ProcessSafely -ProcessName "cloudflared" -DisplayName "Cloudflare Tunnel"

# ===============================
# Detener MongoDB
# ===============================
Stop-ProcessSafely -ProcessName "mongod" -DisplayName "MongoDB"

# ===============================
# Detener Docker Desktop
# ===============================
Write-Host "Deteniendo Docker Desktop..." -ForegroundColor Yellow
try {
    $dockerProcesses = Get-Process | Where-Object { $_.ProcessName -like "*Docker*" -or $_.ProcessName -eq "Docker Desktop" }
    if ($dockerProcesses) {
        $dockerProcesses | Stop-Process -Force
        Write-Host "✅ Docker Desktop detenido correctamente." -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Docker Desktop no estaba en ejecución o ya fue detenido." -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Docker Desktop no estaba en ejecución o ya fue detenido." -ForegroundColor Gray
}
Start-Sleep -Seconds 3

# ===============================
# Detener WSL y Vmmem
# ===============================
Write-Host "Deteniendo WSL y Vmmem..." -ForegroundColor Yellow
try {
    $vmmemProcess = Get-Process -Name "vmmem" -ErrorAction SilentlyContinue
    if ($vmmemProcess) {
        Write-Host "  Vmmem está en ejecución, ejecutando WSL shutdown..." -ForegroundColor Yellow
        & wsl --shutdown
        Start-Sleep -Seconds 3
        
        # Verificar si vmmem sigue ejecutándose
        $vmmemAfter = Get-Process -Name "vmmem" -ErrorAction SilentlyContinue
        if (-not $vmmemAfter) {
            Write-Host "✅ Vmmem detenido correctamente." -ForegroundColor Green
        } else {
            Write-Host "⚠️ Vmmem aún está en ejecución." -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️ Vmmem no estaba en ejecución." -ForegroundColor Gray
        # Ejecutar wsl --shutdown de todas formas para asegurar
        & wsl --shutdown 2>$null
    }
} catch {
    Write-Host "⚠️ Error al detener WSL/Vmmem" -ForegroundColor Gray
}

# ===============================
# Detener servicio Docker
# ===============================
Write-Host "Deteniendo servicio Docker..." -ForegroundColor Yellow
try {
    $dockerService = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    if ($dockerService -and $dockerService.Status -eq "Running") {
        Stop-Service -Name "com.docker.service" -Force
        Write-Host "✅ Servicio Docker detenido correctamente." -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Servicio Docker no estaba en ejecución." -ForegroundColor Gray
    }
} catch {
    Write-Host "ℹ️ Servicio Docker no encontrado o ya estaba detenido." -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🏁 Todos los servicios han sido detenidos." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# ===============================
# Resumen de procesos activos
# ===============================
Write-Host "`n📊 Verificando procesos relacionados restantes:" -ForegroundColor Magenta

$processesToCheck = @("node", "minikube", "cloudflared", "mongod", "vmmem")
$foundProcesses = @()

foreach ($proc in $processesToCheck) {
    $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($running) {
        $foundProcesses += "$proc ($($running.Count) procesos)"
    }
}

if ($foundProcesses.Count -gt 0) {
    Write-Host "⚠️ Procesos aún activos:" -ForegroundColor Yellow
    $foundProcesses | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
} else {
    Write-Host "✅ No se encontraron procesos relacionados activos." -ForegroundColor Green
}

Write-Host "`nPresiona cualquier tecla para cerrar..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")