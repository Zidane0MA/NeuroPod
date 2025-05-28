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
REM Detener Minikube Tunnel
REM ===============================
echo Deteniendo Minikube Tunnel...
taskkill /FI "WINDOWTITLE eq Minikube Tunnel" /F
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Minikube
REM ===============================
echo Deteniendo Minikube...
minikube stop

REM ===============================
REM Detener Cloudflare Tunnel
REM ===============================
echo Deteniendo Cloudflare Tunnel...
taskkill /FI "WINDOWTITLE eq Cloudflare Tunnel" /F
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener MongoDB
REM ===============================
echo Deteniendo MongoDB...
taskkill /FI "IMAGENAME eq mongod.exe" /F
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Backend (Node.js)
REM ===============================
echo Deteniendo Backend...
taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq Backend" /F
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Frontend (Node.js)
REM ===============================
echo Deteniendo Frontend...
taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq Frontend" /F
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Docker Desktop (opcional)
REM ===============================
echo Deteniendo Docker Desktop...
taskkill /FI "IMAGENAME eq Docker Desktop.exe" /F
timeout /t 5 /nobreak >nul

echo Todos los servicios han sido detenidos.
pause
exit