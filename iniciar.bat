@echo off
cd /d "%~dp0"
echo Iniciando Ciudad Virtual...
start "" py -m http.server 8080
timeout /t 2 /nobreak >nul
start "" http://localhost:8080/src/presentacion/vistas/menu.html
echo Servidor corriendo. Cierra esta ventana para detenerlo.
pause