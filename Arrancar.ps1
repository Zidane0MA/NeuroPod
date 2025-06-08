# ===============================
# Verificación de permisos
# ===============================
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Asegúrate de ejecutar este script como ADMINISTRADOR."
    Pause
    exit
}

# ===============================
# Obtener ruta del script actual
# ===============================
$CURRENT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Carpeta base: $CURRENT_DIR"

# ===============================
# Iniciar Docker Desktop
# ===============================
Write-Host "Iniciando Docker Desktop..."
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 10
Write-Host "Esperando a que Docker esté listo..."

# ===============================
# Iniciar Cloudflare Tunnel
# ===============================
wt -w 0 nt -p "Windows PowerShell" --title "Cloudflare Tunnel" powershell -NoExit -Command "cloudflared.exe tunnel run neuropod-tunnel"

# ===============================
# Iniciar Minikube
# ===============================
wt -w 0 nt -p "Windows PowerShell" --title "Minikube" powershell -NoExit -Command "minikube start --driver=docker --container-runtime=docker --gpus=all --memory=12000mb --cpus=8 --addons=ingress,storage-provisioner,default-storageclass"
Start-Sleep -Seconds 23
Write-Host "Esperando a que Minikube esté listo..."

# ===============================
# Iniciar MongoDB (ajusta versión)
# ===============================
if (-not (Test-Path "C:\data\db")) {
    New-Item -ItemType Directory -Path "C:\data\db" | Out-Null
}
wt -w 0 nt -p "Windows PowerShell" --title "MongoDB" powershell -NoExit -Command "& 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe' --dbpath='C:\data\db'"
Start-Sleep -Seconds 10

# ===============================
# Iniciar Minikube Tunnel
# ===============================
wt -w 0 nt -p "Windows PowerShell" --title "Minikube Tunnel" powershell -NoExit -Command "minikube tunnel"

# ===============================
# Obtener ruta del script actual
# ===============================
$CURRENT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Carpeta base: $CURRENT_DIR" -ForegroundColor Green

# ===============================
# Verificar que npm está disponible
# ===============================
Write-Host "Verificando npm..." -ForegroundColor Yellow

# Obtener la ruta completa de npm
try {
    $npmFullPath = (Get-Command npm -ErrorAction Stop).Source
    $npmVersion = & npm --version
    Write-Host "✅ npm encontrado en: $npmFullPath (versión: $npmVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no encontrado. Verifica que Node.js esté instalado correctamente." -ForegroundColor Red
    Write-Host "💡 Descarga Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Presiona cualquier tecla para continuar..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# ===============================
# Iniciar Backend NeuroPod
# ===============================
Write-Host "Iniciando Backend NeuroPod..." -ForegroundColor Yellow
$BackendPath = Join-Path $CURRENT_DIR "NeuroPod-Backend"
Write-Host "Ruta Backend: $BackendPath" -ForegroundColor Cyan

if (Test-Path $BackendPath) {
    # Verificar que package.json existe
    $packageJsonPath = Join-Path $BackendPath "package.json"
    if (Test-Path $packageJsonPath) {
        Start-Sleep -Seconds 2
        
        # Método 1: Usar cmd con Windows Terminal (más compatible)
        $backendCommand = "cd /d `"$BackendPath`" && npm start"
        Write-Host "Comando Backend: $backendCommand" -ForegroundColor Magenta
        wt -w 0 nt --title "NeuroPod Backend" cmd /k $backendCommand
        
        Write-Host "✅ Backend iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ No se encontró package.json en: $packageJsonPath" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No se encontró la carpeta: $BackendPath" -ForegroundColor Red
}

# ===============================
# Iniciar Frontend NeuroPod
# ===============================
Write-Host "Iniciando Frontend NeuroPod..." -ForegroundColor Yellow
$FrontendPath = Join-Path $CURRENT_DIR "NeuroPod-Frontend"
Write-Host "Ruta Frontend: $FrontendPath" -ForegroundColor Cyan

if (Test-Path $FrontendPath) {
    # Verificar que package.json existe
    $packageJsonPath = Join-Path $FrontendPath "package.json"
    if (Test-Path $packageJsonPath) {
        Start-Sleep -Seconds 2
        
        # Método 1: Usar cmd con Windows Terminal (más compatible)
        $frontendCommand = "cd /d `"$FrontendPath`" && npm run dev"
        Write-Host "Comando Frontend: $frontendCommand" -ForegroundColor Magenta
        wt -w 0 nt --title "NeuroPod Frontend" cmd /k $frontendCommand
        
        Write-Host "✅ Frontend iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ No se encontró package.json en: $packageJsonPath" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No se encontró la carpeta: $FrontendPath" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "🚀 NeuroPod iniciado completamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "📊 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔌 Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🌐 Producción: https://app.neuropod.online" -ForegroundColor Cyan
Write-Host "🌐 API: https://api.neuropod.online" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green