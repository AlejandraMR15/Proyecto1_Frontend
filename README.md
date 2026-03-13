# Proyecto1_Frontend

## Estado Actual Del Juego

El proyecto se encuentra en una etapa avanzada de implementación. La base del juego ya está construida, no se identifican errores mayores, y gran parte de los requerimientos de historias de usuario ya están cubiertos. Lo que falta es terminar de conectar y ajustar funcionalidades que ya existen parcialmente.

En resumen: el sistema está bastante completo y estable para seguir cerrando detalles finales.

## Qué Hay Implementado

- Estructura por capas (`acceso_datos`, `modelos`, `negocio`, `presentacion`).
- Lógica principal del juego con control de estado, ejecución de turnos y pausa/reanudación.
- Modelado de ciudad, mapa, construcciones, recursos y ciudadanos.
- Tipos de edificios y procesamiento base de efectos por turno.
- Renderizado de grilla y vista de juego en frontend.
- Menú principal con flujo de nueva partida / continuar.
- Persistencia base con `localStorage` (guardar/cargar datos del juego).
- Integración inicial con APIs externas (clima, noticias, región, ruta).
- Base de ranking y puntuación ya creada para su integración completa.

## Funcionalidades Disponibles

- Crear ciudad y configurar parámetros iniciales.
- Simulación por turnos con actualización de estado de ciudad y recursos.
- Construcciones con costos, consumo y efectos básicos.
- Gestión inicial de población/ciudadanos y cálculos asociados.
- Guardado y carga de partida en su versión actual.
- Interacción visual del mapa y elementos de la ciudad.

## Observaciones Importantes

- Hay que tener muy en cuenta los métodos de serialización porque puede que hayan errores.
- No hay errores mayores; lo principal pendiente es terminar de implementar/conectar algunas funcionalidades que ya existen, pero aún no están completamente integradas.

## Pendientes Principales

Falta organizar y cerrar de forma integral:

- Flujo de construir y demoler construcciones.
- Manejo completo del turno.
- Manejo completo del ranking y la puntuación.
- Exportaciones e importaciones de la ciudad y el mapa a JSON.
- Guardar y cargar partida (cubriendo todos los casos).
- Cargar mapa desde JSON.
- Desglose detallado de recursos.
- Casos de GameOver.

## Historias De Usuario Pendientes

En términos de cobertura funcional, falta terminar de incorporar/ajustar las historias de usuario:

- `2 - 10`
- `14 - 19`
- `20 - 14`

Nota: en general, los requerimientos de las historias ya están muy completos; lo que resta son ajustes de condiciones específicas y detalles de cierre para dejarlas al 100%.