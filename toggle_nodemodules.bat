@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo     TOGGLE NODE_MODULES - AUTO DETECCIÓN
echo ==========================================
echo.

set "BASE_DIR=C:\Users\loler\Downloads\NeuroPod"
set "TEMP_DIR=C:\Users\loler\Downloads\_temp_nodemodules"
set "FRONTEND_NODEMODULES=%BASE_DIR%\NeuroPod-Frontend\node_modules"
set "BACKEND_NODEMODULES=%BASE_DIR%\NeuroPod-Backend\node_modules"

:: Detectar estado actual
set "frontend_visible=0"
set "backend_visible=0"
set "temp_exists=0"

if exist "%FRONTEND_NODEMODULES%" set "frontend_visible=1"
if exist "%BACKEND_NODEMODULES%" set "backend_visible=1"
if exist "%TEMP_DIR%" set "temp_exists=1"

:: Mostrar estado actual
echo 📊 ESTADO ACTUAL:
if !frontend_visible! equ 1 (
    echo    ✅ Frontend node_modules: VISIBLE
) else (
    echo    ❌ Frontend node_modules: OCULTO
)
if !backend_visible! equ 1 (
    echo    ✅ Backend node_modules: VISIBLE
) else (
    echo    ❌ Backend node_modules: OCULTO
)
if !temp_exists! equ 1 (
    echo    📁 Directorio temporal: EXISTE
) else (
    echo    📁 Directorio temporal: NO EXISTE
)
echo.

:: Decidir acción basada en estado
if !frontend_visible! equ 1 (
    if !backend_visible! equ 1 (
        echo 🎯 ACCIÓN: Ocultar node_modules para Claude
        goto :hide_nodemodules
    )
)

if !temp_exists! equ 1 (
    echo 🎯 ACCIÓN: Restaurar node_modules para desarrollo
    goto :restore_nodemodules
)

echo ❓ Estado inconsistente. Selecciona manualmente:
echo    1. Ocultar node_modules (para Claude)
echo    2. Restaurar node_modules (para desarrollo)
echo    3. Salir
echo.
set /p "choice=Selecciona (1-3): "

if "%choice%"=="1" goto :hide_nodemodules
if "%choice%"=="2" goto :restore_nodemodules
if "%choice%"=="3" goto :end
echo ❌ Opción inválida
goto :end

:hide_nodemodules
echo.
echo 📦 OCULTANDO NODE_MODULES...
echo =====================================

:: Crear directorio temporal
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

:: Mover Frontend
if exist "%FRONTEND_NODEMODULES%" (
    move "%FRONTEND_NODEMODULES%" "%TEMP_DIR%\frontend_node_modules" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Frontend node_modules → OCULTO
    ) else (
        echo ❌ Error moviendo Frontend
    )
)

:: Mover Backend
if exist "%BACKEND_NODEMODULES%" (
    move "%BACKEND_NODEMODULES%" "%TEMP_DIR%\backend_node_modules" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Backend node_modules → OCULTO
    ) else (
        echo ❌ Error moviendo Backend
    )
)

echo.
echo 🎯 ¡Listo! Claude puede usar directory_tree sin problemas
goto :end

:restore_nodemodules
echo.
echo 📦 RESTAURANDO NODE_MODULES...
echo ===================================

:: Restaurar Frontend
if exist "%TEMP_DIR%\frontend_node_modules" (
    move "%TEMP_DIR%\frontend_node_modules" "%FRONTEND_NODEMODULES%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Frontend node_modules → RESTAURADO
    ) else (
        echo ❌ Error restaurando Frontend
    )
)

:: Restaurar Backend
if exist "%TEMP_DIR%\backend_node_modules" (
    move "%TEMP_DIR%\backend_node_modules" "%BACKEND_NODEMODULES%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Backend node_modules → RESTAURADO
    ) else (
        echo ❌ Error restaurando Backend
    )
)

:: Limpiar directorio temporal
dir /b "%TEMP_DIR%" 2>nul | findstr /r "." >nul
if !errorlevel! neq 0 (
    rmdir "%TEMP_DIR%" 2>nul
    if !errorlevel! equ 0 echo 🧹 Directorio temporal eliminado
)

echo.
echo 🎯 ¡Listo! Puedes desarrollar normalmente (npm, yarn, build...)
goto :end

:end
echo.
pause