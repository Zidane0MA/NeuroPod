@echo off
setlocal enabledelayedexpansion

REM ===============================
REM Verificación de permisos
REM ===============================
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe %SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Asegúrate de ejecutar este script como ADMINISTRADOR.
    pause
    exit /b
)

REM ===============================
REM Obtener ruta del script actual
REM ===============================
set "CURRENT_DIR=%~dp0"
echo Carpeta base: %CURRENT_DIR%

REM ===============================
REM Iniciar Docker Desktop
REM ===============================
echo Iniciando Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
timeout /t 30 /nobreak >nul
echo Esperando a que Docker esté listo...

REM ===============================
REM Iniciar Cloudflare Tunnel
REM ===============================
start "Cloudflare Tunnel" cmd /k cloudflared.exe tunnel run neuropod-tunnel

REM ===============================
REM Iniciar Minikube
REM ===============================
echo Iniciando Minikube...
minikube start --driver=docker --container-runtime=docker --gpus=all --memory=14000mb --cpus=8 --addons=ingress,storage-provisioner,default-storageclass
timeout /t 30 /nobreak >nul
echo Esperando a que Minikube esté listo...

REM ===============================
REM Iniciar Minikube Tunnel
REM ===============================
start "Minikube Tunnel" cmd /k minikube tunnel

REM ===============================
REM Iniciar MongoDB (ajusta versión)
REM ===============================
start "MongoDB" cmd /k "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"

REM ===============================
REM Iniciar Backend (ruta relativa)
REM ===============================
start "Backend" cmd /k "cd /d %CURRENT_DIR%NeuroPod-Backend && npm start"

REM ===============================
REM Iniciar Frontend (ruta relativa)
REM ===============================
start "Frontend" cmd /k "cd /d %CURRENT_DIR%NeuroPod-frontend && npm run dev"

exit