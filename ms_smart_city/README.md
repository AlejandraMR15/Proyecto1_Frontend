# Microservicio Ciudad Inteligente

Resumen
-------
Servicio backend que calcula rutas sobre un mapa binario.

Instalación: creación de entorno e instalación de librerías
---------------------------------------------------------
Estos pasos funcionan en Windows, macOS y Linux. Usa la sección correspondiente a tu shell.

1) Crear el entorno virtual

PowerShell (Windows):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Bash / macOS / Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

2) Instalar dependencias

```bash
pip install -r requeriments.txt
```

Ejecución del servidor
----------------------
1) Lanza la aplicación:

```bash
python main.py
```

2) Asegúrate de que el servidor escucha en `http://127.0.0.1:5000`.


Convención del mapa
-------------------
- 0 = edificio (no transitable)
- 1 = carretera (transitable)

Formato de la API
-----------------

Supongamos que tenemos el siguiente mapa
![Ejemplo de mapa](assets/mapa_ejemplo.png)


Endpoint:

POST http://127.0.0.1:5000/api/calculate-route

Body (JSON) — ejemplo:
``` JSON
{
 "map": [
  [0,1,1,1],
  [1,1,0,1],
  [0,1,1,0]
 ],
 "start": [0,0],
 "end": [2,3]
}
```


Notas:
- Las coordenadas usan formato `[fila, columna]` y están indexadas desde 0.
- `0` representa edificio y no puede cruzarse.
- `1` representa carretera y puede usarse para trazar la ruta.

Respuesta exitosa (ejemplo):
``` json
{
    "route": [
        [0,0],
        [0,1],
        [0,2],
        [0,3],
        [1,3],
        [2,3]
    ]
}
```

Error si no existe ruta:

Cuando no hay conexión entre `start` y `end` por vías (`1`), el backend responde con HTTP 400 y el siguiente JSON:
``` json
{
    "error": "Edificios no conectados por vías: imposible calcular"
}
```



