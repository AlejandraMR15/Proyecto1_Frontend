# Ciudad Virtual — City Builder Game

Simulador urbano desarrollado como proyecto del curso de Desarrollo Frontend. El jugador asume el rol de alcalde de una ciudad virtual, con la responsabilidad de construir infraestructura, gestionar recursos, atender a los ciudadanos y hacer crecer su ciudad turno a turno.

## Tecnologías

- HTML5, CSS3 y JavaScript puro (sin frameworks ni librerías externas)
- Arquitectura por capas: `acceso_datos`, `modelos`, `negocio`, `presentacion`
- Persistencia con `localStorage` a través de `StorageManager`

## Requisitos

- Navegador moderno con soporte para ES Modules
- Python 3.x con `flask` y `flask-cors` instalados
- Conexión a internet para las APIs externas (clima, noticias, región)

## Cómo ejecutar

Ejecutar el archivo `iniciar.bat`. Esto levanta el microservicio de rutas y el servidor HTTP del frontend, y abre automáticamente el navegador en el menú principal.

También se puede iniciar manualmente:

```bash
# Microservicio de rutas (en /ms_smart_city)
py main.py

# Servidor frontend
py -m http.server 8080 --bind 0.0.0.0
```

Luego abrir `http://localhost:8080/src/presentacion/vistas/menu.html`.

## Estructura del proyecto

```
src/
├── acceso_datos/          # Acceso a localStorage, APIs externas e importación de mapas
│   ├── API/               # ApiClima, ApiNoticias, ApiRegion, ApiDijkstra
│   ├── StorageManager.js  # Único punto de acceso a localStorage
│   ├── CiudadMapper.js    # Reconstrucción de ciudad desde JSON
│   ├── ImportadorCiudad.js
│   └── MapImporter.js     # Carga y validación de mapas desde TXT
├── modelos/               # Entidades del dominio
│   ├── api/               # Noticia, Clima, Ruta, CiudadRegion
│   ├── ciudad.js
│   ├── Ciudadano.js
│   ├── Mapa.js
│   ├── recursos.js
│   └── construccion/      # Edificio, Residencial, Comercial, Industrial, etc.
├── negocio/               # Lógica de negocio y controladores
│   ├── logica/            # Juego, SistemaTurnos, GestorCiudadanos, LogicaDeTurnos, Puntuacion...
│   └── controladores/     # HUD, menús, renderizado, rutas, widgets...
└── presentacion/
    ├── estilos/            # Archivos CSS por componente y responsive
    └── vistas/             # index.html (juego) y menu.html
```

## Funcionalidades implementadas

**Gestión de ciudad**
- Creación de ciudad con nombre, alcalde, región geográfica de Colombia y tamaño de mapa (15×15 a 30×30)
- Carga de mapa prediseñado desde archivo TXT
- Exportación e importación de ciudad a/desde JSON
- Guardado automático cada 30 segundos y guardado manual

**Construcción**
- Vías, edificios residenciales, comerciales, industriales, de servicio, plantas de utilidad y parques
- Validación de celda vacía, presupuesto disponible y vía adyacente obligatoria
- Demolición con reembolso del 50% y gestión de ciudadanos afectados
- Modal de información de cada edificio con estadísticas en tiempo real

**Recursos y economía**
- Ciclo de producción y consumo por turno: dinero, electricidad, agua y comida
- Desglose de recursos con producción, consumo y balance neto por turno
- Historial de recursos de los últimos 20 turnos
- Game Over por dinero, electricidad o agua negativos

**Ciudadanos**
- Creación automática por turno con condiciones de vivienda, empleo y felicidad
- Asignación automática de vivienda y empleo
- Cálculo individual de felicidad según condiciones de vida y servicios
- Eliminación de ciudadanos con felicidad crítica sostenida
- Animación visual de ciudadanos moviéndose por las vías del mapa

**Sistema de rutas**
- Cálculo de ruta óptima entre dos edificios mediante algoritmo Dijkstra (microservicio Python)
- Visualización animada de la ruta sobre el mapa isométrico

**Puntuación y ranking**
- Fórmula de puntuación con base, bonificaciones y penalizaciones
- Desglose detallado visible en el HUD
- Ranking persistente con top 10, exportable a JSON

**APIs externas**
- Clima en tiempo real de la ciudad geográfica seleccionada (OpenWeatherMap)
- Noticias actuales de Colombia (NewsAPI)
- Listado de ciudades colombianas (api-colombia.com)

**Interfaz y experiencia**
- Vista isométrica con cuadrícula generada por CSS y SVG
- Diseño responsive para móvil (portrait y landscape), tablet y desktop
- Atajos de teclado: `B` construir, `R` vías, `D` demoler, `Space` pausa, `S` guardar, `ESC` cancelar
- Modal de pausa con configuraciones ajustables en tiempo real

## APIs utilizadas

[OpenWeatherMap](https://openweathermap.org/api): Clima actual de la región de la ciudad
[NewsAPI](https://newsapi.org/): Noticias recientes
[api-colombia.com](https://api-colombia.com/): Listado de ciudades colombianas
Microservicio (Flask): Cálculo de rutas con Dijkstra

## Claves de API

Las claves se configuran en un archivo `keys.js` en la raíz del proyecto:

```js
export const NEWS_KEY = 'tu_clave_newsapi';
export const OPENWEATHER_KEY = 'tu_clave_openweather';
```