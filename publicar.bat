@echo off
cd /d "%~dp0"
echo.
echo ========================================
echo   Maria Jose Beauty ^& Spa - Publicar
echo ========================================
echo.
set /p mensaje="Describe el cambio (ej: actualizo precios): "
echo.
git add .
git commit -m "%mensaje%"
git push
echo.
echo ========================================
echo   Listo! El sitio se actualiza en ~30s
echo ========================================
echo.
pause
