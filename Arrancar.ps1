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
wt -w 0 nt -p "Windows PowerShell" --title "Minikube" powershell -NoExit -Command "minikube start --driver=docker --container-runtime=docker --gpus=all --memory=14000mb --cpus=8 --addons=ingress,storage-provisioner,default-storageclass"
Start-Sleep -Seconds 23
Write-Host "Esperando a que Minikube esté listo..."

# ===============================
# Iniciar Minikube Tunnel
# ===============================
wt -w 0 nt -p "Windows PowerShell" --title "Minikube Tunnel" powershell -NoExit -Command "minikube tunnel"

# ===============================
# Iniciar MongoDB (ajusta versión)
# ===============================
if (-not (Test-Path "C:\data\db")) {
    New-Item -ItemType Directory -Path "C:\data\db" | Out-Null
}
wt -w 0 nt -p "Windows PowerShell" --title "MongoDB" powershell -NoExit -Command "& 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe' --dbpath='C:\data\db'"
Start-Sleep -Seconds 10