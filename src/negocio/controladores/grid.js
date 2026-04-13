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

import Mapa         from '../../modelos/Mapa.js';
import GridRenderer  from './GridRenderer.js';
import Juego         from '../logica/Juego.js';
import MovimientoCiudadanos from './MovimientoCiudadanos.js';
import { historialRecursos, reiniciarHistorialRecursos } from './historialRecursos.js';
import { crearControlCamara } from './cameraController.js';
import { nombreEtiquetaPorCodigo } from './etiquetasMapa.js';
import StorageManager from '../../acceso_datos/StorageManager.js';

(function () {
    "use strict";

    /* ============================================================
       CLAVES localStorage
    ============================================================ */
    const CLAVE_CONFIG_NUEVA = 'config-nueva-partida';
    const CLAVE_ACCION       = 'accion-inicio';
    const storageManager = new StorageManager();

    const viewport   = document.getElementById('viewport');
    const canvasWrap = document.getElementById('canvas-wrap');
    const zoomLabel  = document.getElementById('zoom-label');
    let rendererRef = null;
    const { applyTransform, centerView, estaArrastrando } = crearControlCamara({
        viewport,
        canvasWrap,
        zoomLabel,
        getRenderer: () => rendererRef,
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
        tooltip.style.setProperty('--tooltip-x', e.clientX + 'px');
        tooltip.style.setProperty('--tooltip-y', e.clientY + 'px');
        tooltip.classList.add('visible');
    }

    /**
     * Oculta el tooltip del grid.
     */
    function hideTooltip() {
        tooltip.classList.remove('visible');
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

        const accion = storageManager.cargar(CLAVE_ACCION);
        const config = storageManager.cargar(CLAVE_CONFIG_NUEVA);

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
            storageManager.eliminar(CLAVE_ACCION);

        } else if (config) {
            // --- NUEVA PARTIDA ---
            tamano = (config.ancho >= 15 && config.ancho <= 30) ? config.ancho : 15;

            // crearCiudad() inicializa ciudad.mapa con el tamaño correcto
            juego.crearCiudad({
                nombre:        config.nombre       || 'Mi Ciudad',
                alcalde:       config.alcalde      || 'Alcalde',
                ancho:         tamano,
                alto:          tamano,
                duracionTurno: config.duracionTurno || 10000,
                dineroInicial: (config.matrizJSON ? 0 : (config.dineroInicial || 50000)),
                coordenadas:   config.regionNombre
                                   ? { nombre: config.regionNombre, id: config.regionId }
                                   : null,
            });

            // Tomar el Mapa que Ciudad ya creó internamente
            mapa = juego.ciudad.mapa;
            
            // Si se cargó un mapa personalizado desde TXT
            if (config.matrizJSON) {
                // Reemplazar la matriz generada con la del TXT
                mapa.matriz = config.matrizJSON;
                // Poblar las construcciones a partir de la matriz
                juego.ciudad.poblarConstruccionesDesdeMatriz(config.matrizJSON);
                // Calcular recursos iniciales basándose en los edificios cargados
                juego.logicaDeTurnos.calcularRecursosIniciales(juego.ciudad);
            } else {
                // Modo normal: generar matriz vacía
                mapa.generarMatriz();
            }

            // Guardar partida inicial via StorageManager para que
            // "Continuar partida" quede disponible en el menú
            juego.guardarPartida();

            // Persistir la duración del turno para que sobreviva recargas
            // (Hud.js la leerá en initHUD() y la aplicará al SistemaTurnos)
            const durSegundos = Math.round((config.duracionTurno || 10000) / 1000);
            juego.StorageManager.guardar('config-turno', { duracionTurno: durSegundos });

            // Limpiar config para que una recarga no re-cree la ciudad
            storageManager.eliminar(CLAVE_CONFIG_NUEVA);
            
            // Limpiar historial solo al crear nueva partida
            reiniciarHistorialRecursos();

        } else {
            // Acceso directo a index.html sin pasar por el menú
            // Cargar partida si existe, si no mapa vacío de emergencia
            const hayPartida = storageManager.cargar('partida') !== null;
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

        rendererRef = renderer;

        renderer.inicializar();

        /* ----------------------------------------------------------
           3. Tooltip
        ---------------------------------------------------------- */
        const gridEl = document.getElementById('iso-grid');

        gridEl.addEventListener('celda-enter', function (e) {
            if (estaArrastrando()) return;
            const { col, row, etiqueta, originalEvent } = e.detail;
            showTooltip(originalEvent, `(${col}, ${row}) — ${nombreEtiquetaPorCodigo(etiqueta)}`);
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
        window.recolectorBurbujas = juego.recolectorBurbujas;

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
           Inicializar historial de recursos
        ---------------------------------------------------------- */
        try {
            historialRecursos.inicializar();
            window.historialRecursos = historialRecursos;
        } catch (err) {
            console.error('[HistorialRecursos] Error al inicializar:', err);
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

})();