/**
 * CIUDAD VIRTUAL — GestorRutas.js
 *
 * Gestiona la interfaz de usuario del sistema de rutas:
 *  - Activar / desactivar el modo de selección de ruta mediante el botón.
 *  - Capturar dos edificios (origen y destino) del grid con clicks del jugador.
 *  - Construir el payload esperado por ApiDijkstra y disparar el cálculo.
 *  - Animar visualmente (pulso) los cubos que conforman la ruta devuelta.
 *  - Limpiar la animación cuando el jugador hace click en cualquier otra celda.
 *
 * Dependencias en tiempo de ejecución (vía window):
 *  - window.mapa          → instancia de Mapa (para generarMatriz01 y coordenadas)
 *  - window.gridRenderer  → instancia de GridRenderer (para acceder a _cubos)
 *
 * NO contiene lógica del algoritmo Dijkstra; esa responsabilidad pertenece
 * exclusivamente a ApiDijkstra.js.
 */

import ApiDijkstra from '../../acceso_datos/API/ApiDijkstra.js';

/* ================================================================
   ESTADO INTERNO DEL GESTOR
================================================================ */

// Indica si el modo "calcular ruta" está activo
let modoRutaActivo = false;

// Almacena el primer punto seleccionado: { col, row } | null
let origen = null;

// Referencia al cubo DOM marcado como origen (para quitarle la clase)
let cuboOrigen = null;

// Instancia reutilizable de la API de rutas
const apiDijkstra = new ApiDijkstra();

// Conjunto de cubos DOM que tienen la animación de ruta activa
// Permite limpiarlos eficientemente sin recorrer todo el grid
const cubosRuta = new Set();

/* ================================================================
   CONSULTAR ESTADO DEL MODO RUTA
================================================================ */

/**
 * Devuelve true si el modo ruta está activo.
 * Exportada para que otros módulos (menuConstruccion.js) consulten el estado.
 */
window.estaModoRutaActivo = function() {
    return modoRutaActivo;
};

/* ================================================================
   ACTIVAR / DESACTIVAR MODO RUTA
================================================================ */

/**
 * Alterna el modo de cálculo de ruta y actualiza el aspecto del botón.
 */
function toggleModoRuta() {
    if (modoRutaActivo) {
        desactivarModoRuta();
    } else {
        activarModoRuta();
    }
}

/**
 * Activa el modo ruta: actualiza botón y reinicia la selección.
 */
function activarModoRuta() {
    modoRutaActivo = true;
    _actualizarBoton(true);
    _reiniciarSeleccion();
    _mostrarNotificacionRuta('Modo ruta: selecciona el edificio de origen');
}

/**
 * Desactiva el modo ruta: limpia estado visual y de selección.
 */
function desactivarModoRuta() {
    modoRutaActivo = false;
    _actualizarBoton(false);
    _reiniciarSeleccion();
    limpiarRuta();
}

/* ================================================================
   GESTIÓN DE CLICKS EN EL GRID
================================================================ */

/**
 * Procesa cada evento 'celda-click' emitido por GridRenderer.
 * Solo actúa cuando el modo ruta está habilitado.
 *
 * Flujo:
 *  1er click → registrar origen (edificio no-vía)
 *  2do click → registrar destino → llamar a la API → animar ruta
 *  Click en celda sin edificio → notificar al usuario
 *  Click fuera del modo → limpiar ruta si había una activa
 *
 * @param {CustomEvent} e  Evento con detail { col, row, etiqueta }
 */
function manejarClickCelda(e) {
    const { col, row, etiqueta } = e.detail;

    // Si el modo ruta no está activo, solo limpiar la ruta animada si la hay
    if (!modoRutaActivo) {
        if (cubosRuta.size > 0) limpiarRuta();
        return;
    }

    // Modo ruta activo: cualquier click en vía o terreno vacío CANCELA el modo
    // (no bloquea la construcción — el jugador claramente quiere hacer otra cosa)
    if (etiqueta === 'r' || etiqueta === 'g') {
        desactivarModoRuta();
        return;
    }

    // A partir de aquí: click en un edificio con modo ruta activo
    // Detener la propagación para que menuConstruccion no lo interprete
    e.stopPropagation();

    if (origen === null) {
        // ----- PRIMER CLICK: fijar origen -----
        origen = { col, row };
        cuboOrigen = _obtenerCubo(col, row);
        if (cuboOrigen) cuboOrigen.classList.add('ruta-origen');
        _mostrarNotificacionRuta(`Origen: (${col}, ${row}) — ahora selecciona el destino`);

    } else {
        // ----- SEGUNDO CLICK: fijar destino y calcular -----
        if (origen.col === col && origen.row === row) {
            _mostrarNotificacionRuta('⚠ El destino debe ser diferente al origen', 'error');
            return;
        }

        const destino = { col, row };
        _calcularYAnimarRuta(origen, destino);
        _reiniciarSeleccion();
    }
}

/* ================================================================
   LLAMADA A LA API Y ANIMACIÓN
================================================================ */

/**
 * Construye el payload, llama a ApiDijkstra y anima la ruta resultante.
 *
 * @param {{ col: number, row: number }} origen
 * @param {{ col: number, row: number }} destino
 */
async function _calcularYAnimarRuta(origen, destino) {
    const mapa = window.mapa;
    if (!mapa) {
        console.error('[GestorRutas] window.mapa no disponible.');
        return;
    }

    // Limpiar cualquier ruta anterior antes de mostrar la nueva
    limpiarRuta();

    // Construir el payload esperado por ApiDijkstra.calcularRuta()
    // La API requiere: { map: number[][], start: [fila, col], end: [fila, col] }
    const payload = {
        map:   mapa.generarMatriz01(),
        start: [origen.row,  origen.col],
        end:   [destino.row, destino.col]
    };

    try {
        _mostrarNotificacionRuta('⏳ Calculando ruta...');
        const resultado = await apiDijkstra.calcularRuta(payload);

        const ruta = resultado?.route ?? [];

        if (ruta.length === 0) {
            _mostrarNotificacionRuta('⚠ No existe ruta entre los puntos seleccionados', 'error');
            return;
        }

        _animarRuta(ruta);
        const celdasIntermedia = Math.max(0, ruta.length - 2);
        _mostrarNotificacionRuta(`✔ Ruta encontrada: ${celdasIntermedia} celdas entre los edificios`);

    } catch (err) {
        console.error('[GestorRutas] Error al calcular ruta:', err);
        _mostrarNotificacionRuta(`✖ Error al calcular ruta: ${err.message}`, 'error');
    }
}

/* ================================================================
   ANIMACIÓN DE LA RUTA
================================================================ */

/**
 * Añade la clase CSS de pulso a cada cubo de la ruta devuelta por la API.
 * Los cubos se guardan en `cubosRuta` para limpiarlos después.
 *
 * @param {Array<[number, number]>} ruta  Array de [fila, columna]
 */
function _animarRuta(ruta) {
    const renderer = window.gridRenderer;
    if (!renderer) return;

    ruta.forEach(function ([fila, col]) {
        const cubo = _obtenerCubo(col, fila);
        if (cubo) {
            cubo.classList.add('ruta-pulso');
            cubosRuta.add(cubo);
        }
    });
}

/**
 * Elimina la animación de ruta de todos los cubos marcados.
 * Se llama al hacer click en cualquier celda fuera del modo ruta
 * o al calcular una nueva ruta.
 */
function limpiarRuta() {
    cubosRuta.forEach(function (cubo) {
        cubo.classList.remove('ruta-pulso');
    });
    cubosRuta.clear();
}

/* ================================================================
   UTILIDADES INTERNAS
================================================================ */

/**
 * Reinicia la selección de origen sin desactivar el modo ruta.
 * @private
 */
function _reiniciarSeleccion() {
    if (cuboOrigen) {
        cuboOrigen.classList.remove('ruta-origen');
        cuboOrigen = null;
    }
    origen = null;
}

/**
 * Obtiene el elemento DOM del cubo en la coordenada (col, row)
 * usando el mapa interno de GridRenderer.
 *
 * @private
 * @param {number} col
 * @param {number} row
 * @returns {HTMLElement|null}
 */
function _obtenerCubo(col, row) {
    const renderer = window.gridRenderer;
    if (!renderer || !renderer._cubos) return null;
    return renderer._cubos.get(`${col},${row}`) ?? null;
}

/**
 * Actualiza el estado visual del botón según si el modo está activo o no.
 *
 * @private
 * @param {boolean} activo
 */
function _actualizarBoton(activo) {
    const btn = document.getElementById('btn-calcular-ruta');
    if (!btn) return;
    btn.dataset.activo = activo ? 'true' : 'false';
    btn.title = activo
        ? 'Modo ruta activo — haz click para desactivar'
        : 'Calcular ruta entre dos edificios';
}

/**
 * Reutiliza la función de notificación del módulo de construcción si está
 * disponible; si no, hace console.log como fallback.
 *
 * @private
 * @param {string} mensaje
 * @param {'info'|'error'} [tipo='info']
 */
function _mostrarNotificacionRuta(mensaje, tipo = 'info') {
    // Intentar reutilizar el mismo sistema de notificaciones del sidebar
    const evento = new CustomEvent('notificacion-ruta', {
        bubbles: true,
        detail: { mensaje, tipo }
    });
    document.dispatchEvent(evento);
    console.debug('[GestorRutas]', mensaje);
}

/* ================================================================
   INIT
================================================================ */
document.addEventListener('DOMContentLoaded', function () {

    /* ---- Botón de calcular ruta ---- */
    const btnRuta = document.getElementById('btn-calcular-ruta');
    if (btnRuta) {
        btnRuta.addEventListener('click', toggleModoRuta);
    } else {
        console.warn('[GestorRutas] No se encontró #btn-calcular-ruta en el DOM.');
    }

    /* ---- Escuchar clicks del grid para selección de origen / destino ---- */
    // Se suscribe a nivel de document para ser consistente con menuConstruccion.js
    document.addEventListener('celda-click', manejarClickCelda);

    /* ---- Escuchar el evento de notificación para mostrarlo en el toast ---- */
    document.addEventListener('notificacion-ruta', function (e) {
        // Mostrar las notificaciones usando el mismo toast del sidebar de construcción
        // La función mostrarNotificacion es local de menuConstruccion.js, así que
        // disparamos el mismo evento custom que él usa, o creamos un toast propio.
        _mostrarToastRuta(e.detail.mensaje, e.detail.tipo);
    });
});

/* ================================================================
   TOAST DE NOTIFICACIONES PROPIO DEL MÓDULO DE RUTAS
================================================================ */

/**
 * Muestra un toast en la parte inferior central de la pantalla.
 * Desaparece automáticamente tras 3 segundos.
 *
 * @param {string} mensaje
 * @param {'info'|'error'} [tipo='info']
 */
function _mostrarToastRuta(mensaje, tipo = 'info') {
    // Reutilizar toast existente o crear uno nuevo
    let toast = document.getElementById('toast-ruta');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-ruta';
        document.body.appendChild(toast);
    }

    toast.textContent = mensaje;
    toast.className = 'toast-ruta-visible' + (tipo === 'error' ? ' toast-ruta-error' : '');

    // Limpiar timeout anterior si el usuario hace múltiples acciones rápidas
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () {
        toast.className = '';
    }, 3000);
}