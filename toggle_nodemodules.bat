@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo   TOGGLE NODE_MODULES + GIT - AUTO DETECCION
echo ==========================================
echo.

set "BASE_DIR=C:\Users\loler\Downloads\NeuroPod"
set "TEMP_DIR=C:\Users\loler\Downloads\_temp_nodemodules"
set "FRONTEND_NODEMODULES=%BASE_DIR%\NeuroPod-Frontend\node_modules"
set "BACKEND_NODEMODULES=%BASE_DIR%\NeuroPod-Backend\node_modules"
set "MAIN_GIT=%BASE_DIR%\.git"

:: Detectar estado actual
set "frontend_nm_visible=0"
set "backend_nm_visible=0"
set "main_git_visible=0"
set "temp_exists=0"

if exist "%FRONTEND_NODEMODULES%" set "frontend_nm_visible=1"
if exist "%BACKEND_NODEMODULES%" set "backend_nm_visible=1"
if exist "%MAIN_GIT%" set "main_git_visible=1"
if exist "%TEMP_DIR%" set "temp_exists=1"

:: Mostrar estado actual
echo ESTADO ACTUAL:
echo    NODE_MODULES:
if !frontend_nm_visible! equ 1 (
    echo       Frontend: VISIBLE
) else (
    echo       Frontend: OCULTO
)
if !backend_nm_visible! equ 1 (
    echo       Backend: VISIBLE
) else (
    echo       Backend: OCULTO
)
echo    GIT REPOSITORY:
if !main_git_visible! equ 1 (
    echo       Principal: VISIBLE
) else (
    echo       Principal: OCULTO
)
if !temp_exists! equ 1 (
    echo    Directorio temporal: EXISTE
) else (
    echo    Directorio temporal: NO EXISTE
)
echo.

:: Decidir acción basada en estado (node_modules es prioritario)
set "nodemodules_visible=0"
if !frontend_nm_visible! equ 1 set "nodemodules_visible=1"
if !backend_nm_visible! equ 1 set "nodemodules_visible=1"

if !nodemodules_visible! equ 1 (
    echo ACCION: Ocultar node_modules + intentar .git para Claude
    goto :hide_folders
)

if !temp_exists! equ 1 (
    echo ACCION: Restaurar node_modules + .git para desarrollo
    goto :restore_folders
)

echo Estado inconsistente. Selecciona manualmente:
echo    1. Ocultar node_modules + .git (para Claude)
echo    2. Restaurar node_modules + .git (para desarrollo)
echo    3. Salir
echo.
set /p "choice=Selecciona (1-3): "

if "%choice%"=="1" goto :hide_folders
if "%choice%"=="2" goto :restore_folders
if "%choice%"=="3" goto :end
echo Opcion invalida
goto :end

:hide_folders
echo.
echo OCULTANDO NODE_MODULES + GIT...
echo =====================================

:: Crear directorio temporal
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

:: Mover node_modules Frontend
if exist "%FRONTEND_NODEMODULES%" (
    move "%FRONTEND_NODEMODULES%" "%TEMP_DIR%\frontend_node_modules" >nul 2>&1
    if !errorlevel! equ 0 (
        echo Frontend node_modules - OCULTO
    ) else (
        echo Error moviendo Frontend node_modules
    )
)

:: Mover node_modules Backend
if exist "%BACKEND_NODEMODULES%" (
    move "%BACKEND_NODEMODULES%" "%TEMP_DIR%\backend_node_modules" >nul 2>&1
    if !errorlevel! equ 0 (
        echo Backend node_modules - OCULTO
    ) else (
        echo Error moviendo Backend node_modules
    )
)

:: Mover .git Principal (solo si no está en uso)
if exist "%MAIN_GIT%" (
    echo Intentando mover .git...

    :: Intentar renombrar .git a test_git
    ren "%MAIN_GIT%" test_git >nul 2>&1
    if !errorlevel! equ 0 (
        :: Ahora mover test_git a temp
        move "%BASE_DIR%\test_git" "%TEMP_DIR%\main_git" >nul 2>&1
        if !errorlevel! equ 0 (
            echo Principal .git - OCULTO
        ) else (
            echo Error moviendo Principal .git
            :: Intentar restaurar el nombre si falla el move
            ren "%BASE_DIR%\test_git" .git >nul 2>&1
        )
    ) else (
        echo Principal .git - SALTADO ^(en uso o protegido^)
        echo ^(Solo node_modules fue movido, suficiente para directory_tree^)
    )
) else (
    echo Principal .git - NO ENCONTRADO
)

echo.
echo Listo! Claude puede usar directory_tree sin problemas
goto :end

:restore_folders
echo.
echo RESTAURANDO NODE_MODULES + GIT...
echo ===================================

:: Restaurar node_modules Frontend
if exist "%TEMP_DIR%\frontend_node_modules" (
    move "%TEMP_DIR%\frontend_node_modules" "%FRONTEND_NODEMODULES%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo Frontend node_modules - RESTAURADO
    ) else (
        echo Error restaurando Frontend node_modules
    )
)

:: Restaurar node_modules Backend
if exist "%TEMP_DIR%\backend_node_modules" (
    move "%TEMP_DIR%\backend_node_modules" "%BACKEND_NODEMODULES%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo Backend node_modules - RESTAURADO
    ) else (
        echo Error restaurando Backend node_modules
    )
)

:: Restaurar .git Principal
if exist "%TEMP_DIR%\main_git" (
    echo Restaurando .git...
    :: Mover de temp a BASE_DIR como test_git
    move "%TEMP_DIR%\main_git" "%BASE_DIR%\test_git" >nul 2>&1
    if !errorlevel! equ 0 (
        :: Renombrar test_git a .git
        ren "%BASE_DIR%\test_git" .git >nul 2>&1
        if !errorlevel! equ 0 (
            echo Principal .git - RESTAURADO
        ) else (
            echo Error renombrando test_git a .git
        )
    ) else (
        echo Error restaurando Principal .git
    )
) else (
    echo Principal .git - NO ESTABA MOVIDO ^(estaba protegido^)
)

:: Limpiar directorio temporal
dir /b "%TEMP_DIR%" 2>nul | findstr /r "." >nul
if !errorlevel! neq 0 (
    rmdir "%TEMP_DIR%" 2>nul
    if !errorlevel! equ 0 echo Directorio temporal eliminado
)

echo.
echo Listo! Desarrollo normal (npm, yarn, git, build...)
goto :end

:end
echo.
pause