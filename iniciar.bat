@echo off
cd /d "%~dp0"

echo Iniciando Ciudad Virtual...

start "Microservicio Rutas" cmd /k "cd /d ""%~dp0ms_smart_city"" && python main.py"
start "Frontend Ciudad Virtual" py -m http.server 8080
timeout /t 2 /nobreak >nul
start "" http://localhost:8080/src/presentacion/vistas/menu.html

echo Microservicio y frontend iniciados.
echo Cierra las ventanas de servicio para detener la aplicacion.
pause
