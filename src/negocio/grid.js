/**
 * CIUDAD VIRTUAL — grid.js
 *
 * Responsabilidades:
 *  1. Zoom + pan sobre el viewport.
 *  2. Leer la acción del menú desde localStorage y arrancar el juego:
 *       - 'config-nueva-partida' → instancia Juego, llama crearCiudad(), construye el mapa.
 *       - 'accion-inicio: continuar' → instancia Juego, llama cargarPartida(), reconstruye el mapa.
 *  3. Guardar la partida automáticamente cada vez que cambia el mapa.
 *  4. Conectar el tooltip con los eventos de GridRenderer.
 */

import Mapa         from '../modelos/Mapa.js';
import GridRenderer  from './GridRenderer.js';
import Juego         from './Juego.js';
import MovimientoCiudadanos from './MovimientoCiudadanos.js';

(function () {
    "use strict";

    /* ============================================================
       CLAVES localStorage
    ============================================================ */
    const CLAVE_CONFIG_NUEVA = 'config-nueva-partida';
    const CLAVE_ACCION       = 'accion-inicio';

    /* ============================================================
       ZOOM + PAN
    ============================================================ */
    const ZOOM_MIN  = 0.3;
    const ZOOM_MAX  = 3.0;
    const ZOOM_STEP = 0.15;

    let scale      = 1.0;
    let panX       = 0;
    let panY       = 0;
    let isDragging = false;
    let lastMouse  = { x: 0, y: 0 };

    const viewport   = document.getElementById('viewport');
    const canvasWrap = document.getElementById('canvas-wrap');
    const zoomLabel  = document.getElementById('zoom-label');

    /**
     * Aplica transformación CSS de pan y zoom al canvas.
     */
    function applyTransform() {
        canvasWrap.style.transform =
            `translate(${panX}px, ${panY}px) scale(${scale})`;
        zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

    /**
     * Hace zoom centrado en un punto del viewport.
     * @param {number} cx
     * @param {number} cy
     * @param {number} delta
     */
    function zoomAt(cx, cy, delta) {
        const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
        if (newScale === scale) return;
        panX = cx - (cx - panX) * (newScale / scale);
        panY = cy - (cy - panY) * (newScale / scale);
        scale = newScale;
        applyTransform();
    }

    viewport.addEventListener('wheel', function (e) {
        e.preventDefault();
        const rect  = viewport.getBoundingClientRect();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, delta);
    }, { passive: false });

    document.getElementById('btn-zoom-in').addEventListener('click', function () {
        zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, ZOOM_STEP);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', function () {
        zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, -ZOOM_STEP);
    });
    document.getElementById('btn-zoom-reset').addEventListener('click', function () {
        scale = 1.0;
        centerView();
        applyTransform();
    });

    /* ============================================================
       PAN
    ============================================================ */
    viewport.addEventListener('mousedown', function (e) {
        isDragging = true;
        lastMouse  = { x: e.clientX, y: e.clientY };
        viewport.classList.add('dragging');
        e.preventDefault();
    });

    viewport.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        panX += e.clientX - lastMouse.x;
        panY += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        applyTransform();
    });

    document.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false;
            viewport.classList.remove('dragging');
        }
    });

    /* Touch */
    let lastTouches = null;

    viewport.addEventListener('touchstart', function (e) {
        lastTouches = e.touches;
        e.preventDefault();
    }, { passive: false });

    viewport.addEventListener('touchmove', function (e) {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouches?.length === 1) {
            panX += e.touches[0].clientX - lastTouches[0].clientX;
            panY += e.touches[0].clientY - lastTouches[0].clientY;
            applyTransform();
        } else if (e.touches.length === 2 && lastTouches?.length === 2) {
            const dist = (t) => Math.hypot(
                t[0].clientX - t[1].clientX,
                t[0].clientY - t[1].clientY
            );
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = viewport.getBoundingClientRect();
            zoomAt(cx - rect.left, cy - rect.top,
                   (dist(e.touches) - dist(lastTouches)) * 0.005);
        }
        lastTouches = e.touches;
    }, { passive: false });

    viewport.addEventListener('touchend', function (e) {
        lastTouches = e.touches;
    });

    /* ============================================================
       TOOLTIP
    ============================================================ */
    const tooltip = document.getElementById('tooltip');

    /**
     * Muestra el tooltip en la posición del puntero.
     * @param {MouseEvent} e
     * @param {string} text
     */
    function showTooltip(e, text) {
        tooltip.textContent = text;
        tooltip.classList.add('visible');
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top  = (e.clientY - 32) + 'px';
    }

    /**
     * Oculta el tooltip del grid.
     */
    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    document.addEventListener('mousemove', function (e) {
        if (tooltip.classList.contains('visible')) {
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY - 32) + 'px';
        }
    });

    /* ============================================================
       CENTRAR VISTA
    ============================================================ */
    /**
     * Centra la escena isométrica dentro del viewport.
     */
    function centerView() {
        const scene = document.getElementById('iso-scene');
        panX = (viewport.clientWidth  - scene.offsetWidth  * scale) / 2;
        panY = (viewport.clientHeight - scene.offsetHeight * scale) / 2;
    }

    /* ============================================================
       INIT — Juego + Mapa + GridRenderer
    ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {

        /* ----------------------------------------------------------
           1. Leer acción del menú y preparar Juego + Mapa
        ---------------------------------------------------------- */
        const juego  = new Juego();
        let   mapa   = null;
        let   tamano = 15;

        const accion    = localStorage.getItem(CLAVE_ACCION);
        const configRaw = localStorage.getItem(CLAVE_CONFIG_NUEVA);

        if (accion === 'continuar') {
            // --- CONTINUAR PARTIDA ---
            // cargarPartida() usa StorageManager.cargar('partida') internamente
            // y reconstruye ciudad + ciudadanos desde localStorage
            juego.cargarPartida();

            if (juego.ciudad && juego.ciudad.mapa) {
                // Reutilizar el Mapa que ya reconstruyó Ciudad.fromJSON()
                mapa   = juego.ciudad.mapa;
                tamano = mapa.ancho;
            } else {
                // Fallback: si la carga falla por alguna razón, mapa vacío 15x15
                console.warn('[grid] cargarPartida no produjo ciudad válida, usando mapa vacío.');
                mapa = new Mapa(15, 15);
                mapa.generarMatriz();
                tamano = 15;
            }

            // Limpiar la clave de acción para que próximas recargas no re-carguen
            localStorage.removeItem(CLAVE_ACCION);

        } else if (configRaw) {
            // --- NUEVA PARTIDA ---
            let config = {};
            try { config = JSON.parse(configRaw); } catch { config = {}; }

            tamano = (config.ancho >= 15 && config.ancho <= 30) ? config.ancho : 15;

            // crearCiudad() inicializa ciudad.mapa con el tamaño correcto
            juego.crearCiudad({
                nombre:        config.nombre       || 'Mi Ciudad',
                alcalde:       config.alcalde      || 'Alcalde',
                ancho:         tamano,
                alto:          tamano,
                duracionTurno: config.duracionTurno || 10000,
                dineroInicial: config.dineroInicial || 50000,
                coordenadas:   config.regionNombre
                                   ? { nombre: config.regionNombre, id: config.regionId }
                                   : null,
            });

            // Tomar el Mapa que Ciudad ya creó internamente
            mapa = juego.ciudad.mapa;
            // generarMatriz() inicializa todas las celdas con 'g'
            mapa.generarMatriz();

            // Guardar partida inicial via StorageManager para que
            // "Continuar partida" quede disponible en el menú
            juego.guardarPartida();

            // Limpiar config para que una recarga no re-cree la ciudad
            localStorage.removeItem(CLAVE_CONFIG_NUEVA);

        } else {
            // Acceso directo a index.html sin pasar por el menú
            // Cargar partida si existe, si no mapa vacío de emergencia
            const hayPartida = localStorage.getItem('partida') !== null;
            if (hayPartida) {
                juego.cargarPartida();
                mapa   = juego.ciudad?.mapa ?? new Mapa(15, 15);
                tamano = mapa.ancho;
                if (!juego.ciudad) mapa.generarMatriz();
            } else {
                mapa = new Mapa(15, 15);
                mapa.generarMatriz();
                tamano = 15;
            }
        }

        /* ----------------------------------------------------------
           2. Crear GridRenderer con el Mapa de la ciudad
        ---------------------------------------------------------- */
        const renderer = new GridRenderer(mapa, {
            contenedorId: 'iso-grid',
            TW: 64,
            TD: 32,
            onCeldaClick: (col, row, etiqueta) => {
                console.debug(`[Grid] click → col:${col} row:${row} etiqueta:"${etiqueta}"`);
                // TODO: aquí se conectará la herramienta seleccionada en la UI
            }
        });

        renderer.inicializar();

        /* ----------------------------------------------------------
           3. Tooltip
        ---------------------------------------------------------- */
        const gridEl = document.getElementById('iso-grid');

        gridEl.addEventListener('celda-enter', function (e) {
            if (isDragging) return;
            const { col, row, etiqueta, originalEvent } = e.detail;
            showTooltip(originalEvent, `(${col}, ${row}) — ${_nombreEtiqueta(etiqueta)}`);
        });

        gridEl.addEventListener('celda-leave', hideTooltip);

        /* ----------------------------------------------------------
           4. Guardar partida automáticamente cuando cambia el mapa
              Se escucha el evento 'celda-click' que emite GridRenderer
        ---------------------------------------------------------- */
        gridEl.addEventListener('celda-click', function () {
            if (juego.ciudad) {
                // Sincronizar el mapa del modelo con el que tiene ciudad
                // (son el mismo objeto, pero lo explicitamos)
                juego.ciudad.mapa = mapa;
                juego.guardarPartida();
                console.debug('[grid] Partida guardada automáticamente.');
            }
        });

        /* ----------------------------------------------------------
           5. Exponer globalmente para consola / módulos externos
        ---------------------------------------------------------- */
        window.juego        = juego;
        window.mapa         = mapa;
        window.gridRenderer = renderer;

        try {
            const movimientoCiudadanos = new MovimientoCiudadanos(
                mapa,
                renderer,
                juego.gestorCiudadanos,
                { intervaloMs: 2500 }
            );
            movimientoCiudadanos.iniciar();
            window.movimientoCiudadanos = movimientoCiudadanos;
        } catch (err) {
            console.error('[MovimientoCiudadanos] Error al inicializar:', err);
        }
        
        /* ----------------------------------------------------------
           6. Centrar vista
        ---------------------------------------------------------- */
        setTimeout(function () {
            centerView();
            applyTransform();
        }, 80);

        console.info('[CiudadVirtual] Listo.',
            juego.ciudad
                ? `Ciudad: "${juego.ciudad.nombre}" | Turno: ${juego.numeroTurno}`
                : 'Sin ciudad activa.'
        );
    });

    /* ============================================================
       Utilidad: nombre legible por etiqueta
    ============================================================ */
    /**
     * Traduce una etiqueta de celda a nombre legible.
     * @param {string} etiqueta
     * @returns {string}
     */
    function _nombreEtiqueta(etiqueta) {
        const nombres = {
            'g':  'Terreno vacío',
            'r':  'Vía',
            'P1': 'Parque',
            'R1': 'Residencial Básico',
            'R2': 'Residencial Avanzado',
            'C1': 'Comercio Básico',
            'C2': 'Comercio Avanzado',
            'I1': 'Industrial Básico',
            'I2': 'Industrial Avanzado',
            'S1': 'Servicio Básico',
            'S2': 'Servicio Medio',
            'S3': 'Servicio Avanzado',
            'U1': 'Planta de Utilidad Básica',
            'U2': 'Planta de Utilidad Avanzada',
        };
        return nombres[etiqueta] ?? etiqueta;
    }

})();