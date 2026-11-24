@echo off
setlocal
cd /d "%~dp0"
docker compose version >nul 2>&1
if errorlevel 1 (
  echo Instala Docker Desktop y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
docker compose up --build -d --wait
if errorlevel 1 (
  echo No se pudo iniciar el proyecto. Revisa que Docker Desktop este en ejecucion.
  echo Consulta el README y ejecuta: docker compose logs app
  pause
  exit /b 1
)
echo.
echo Nexo Inventario esta listo.
echo Abre http://localhost:3000.
echo Si configuraste APP_PORT en .env, usa ese puerto.
pause
