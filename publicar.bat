@echo off
cd /d "%~dp0"
echo.
echo ==========================================
echo   Maria Jose Beauty ^& Spa — Publicar
echo ==========================================
echo.
echo Archivos que se publicaran:
echo   - index.html
echo   - css/styles.css
echo   - css/hero3d.css    (flor 3D hero)
echo   - css/enhancements.css
echo   - js/main.js
echo   - js/hero3d.js
echo   - js/enhancements.js
echo.
set /p mensaje="Describe el cambio (ej: mejora hero mobile): "
echo.
git add .
git commit -m "%mensaje%"
git push
echo.
echo ==========================================
echo   Listo! El sitio se actualiza en ~30s
echo ==========================================
echo.
pause
