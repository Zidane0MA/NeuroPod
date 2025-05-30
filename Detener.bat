@echo off
setlocal enabledelayedexpansion

REM ===============================
REM Verificación de permisos
REM ===============================
>nul 2>&1 net session
if %errorlevel% NEQ 0 (
    echo Asegurate de ejecutar este script como ADMINISTRADOR.
    pause
    exit /b
)

REM ===============================
REM Detener Minikube Tunnel
REM ===============================
echo Deteniendo Minikube Tunnel...
taskkill /IM minikube.exe /F
if %errorlevel% EQU 0 (
    echo Minikube Tunnel detenido correctamente.
) else (
    echo Minikube Tunnel no estaba en ejecucion o ya fue detenido.
)
echo.
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Minikube
REM ===============================
echo Deteniendo Minikube...
for /f "tokens=*" %%i in ('minikube status --format "{{.Host}}"') do set STATUS=%%i

if "%STATUS%"=="Running" (
    minikube stop
    if %errorlevel% EQU 0 (
        echo Minikube detenido correctamente.
    ) else (
        echo Hubo un problema al detener Minikube.
    )
) else (
    echo Minikube no estaba en ejecucion o ya fue detenido.
)

echo.
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Cloudflare Tunnel
REM ===============================
echo Deteniendo Cloudflare Tunnel...
taskkill /IM cloudflared.exe /F
if %errorlevel% EQU 0 (
    echo Cloudflare Tunnel detenido correctamente.
) else (
    echo Cloudflare Tunnel no estaba en ejecución o ya fue detenido.
)
echo.
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener MongoDB
REM ===============================
echo Deteniendo MongoDB...
taskkill /FI "IMAGENAME eq mongod.exe" /F
if %errorlevel% EQU 0 (
    echo MongoDB detenido correctamente.
) else (
    echo MongoDB no estaba en ejecución o ya fue detenido.
)
echo.
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Backend (Node.js)
REM ===============================
echo Deteniendo Backend...
taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq Backend" /F
if %errorlevel% EQU 0 (
    echo Backend detenido correctamente.
) else (
    echo Backend no estaba en ejecución o ya fue detenido.
)
echo.
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Frontend (Node.js)
REM ===============================
echo Deteniendo Frontend...
taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq Frontend" /F
if %errorlevel% EQU 0 (
    echo Frontend detenido correctamente.
) else (
    echo Frontend no estaba en ejecución o ya fue detenido.
)
echo.
timeout /t 2 /nobreak >nul

REM ===============================
REM Detener Docker Desktop (opcional)
REM ===============================
echo Deteniendo Docker Desktop...
taskkill /FI "IMAGENAME eq Docker Desktop.exe" /F
if %errorlevel% EQU 0 (
    echo Docker Desktop detenido correctamente.
) else (
    echo Docker Desktop no estaba en ejecución o ya fue detenido.
)
echo.
timeout /t 5 /nobreak >nul

REM ===============================
REM Detener Vmmem
REM ===============================
echo Deteniendo Vmmem...
tasklist | findstr /i "vmmem" >nul

if %errorlevel% EQU 0 (
    echo Vmmem está en ejecución, deteniéndolo...
    wsl --shutdown
    if %errorlevel% EQU 0 (
        echo Vmmem detenido correctamente.
    ) else (
        echo Hubo un problema al detener Vmmem.
    )
) else (
    echo Vmmem no estaba en ejecución o ya fue detenido.
)
wsl --shutdown
net stop com.docker.service

echo.
timeout /t 2 /nobreak >nul

echo Todos los servicios han sido detenidos.
pause
exit