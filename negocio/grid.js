/**
 * CIUDAD VIRTUAL — grid.js  (refactorizado)
 *
 * Responsabilidades:
 *  1. Zoom + pan sobre el viewport.
 *  2. Cargar los JSONs de edificios al iniciar.
 *  3. Leer la acción del menú desde localStorage y arrancar el juego:
 *       - 'config-nueva-partida' → instancia Juego, llama crearCiudad(), construye el mapa.
 *       - 'accion-inicio: continuar' → instancia Juego, llama cargarPartida(), reconstruye el mapa.
 *  4. Guardar la partida automáticamente cada vez que cambia el mapa.
 *  5. Conectar el tooltip con los eventos de GridRenderer.
 *  6. En onCeldaClick:
 *       - Celda ocupada → mostrar panel de info del objeto.
 *       - Celda vacía + edificio seleccionado → validar dinero → construir.
 */

import Mapa        from '../modelos/Mapa.js';
import GridRenderer from './GridRenderer.js';
import Juego        from './Juego.js';

(function () {
    "use strict";

    /* ============================================================
       CLAVES localStorage
    ============================================================ */
    const CLAVE_CONFIG_NUEVA = 'config-nueva-partida';
    const CLAVE_ACCION       = 'accion-inicio';

    /* ============================================================
       CACHE DE JSONs
       Se cargan UNA sola vez al iniciar antes de construir la grilla.
       datosEdificios['comercial'] = [{tienda...}, {centroComercial...}]
    ============================================================ */
    const datosEdificios = {};

    async function cargarJSONs() {
        const BASE = '../../datos/';
        const archivos = {
            residencial:     'residencial.json',
            comercial:       'comercial.json',
            industrial:      'industrial.json',
            servicio:        'servicio.json',
            plantasUtilidad: 'plantasUtilidad.json',
            parques:         'parques.json',
            vias:            'vias.json'
        };
        for (const [clave, archivo] of Object.entries(archivos)) {
            const res = await fetch(BASE + archivo);
            datosEdificios[clave] = await res.json();
        }
    }

    /* ============================================================
       PANEL DE INFORMACIÓN DE EDIFICIO
       Se muestra al hacer click en una celda ya construida.
       Llama a getInformacion() del objeto guardado en ciudad.construcciones.
    ============================================================ */
    const ETIQUETAS_INFO = {
        nombre:                    'Nombre',
        costo:                     'Costo',
        costoMantenimiento:        'Mantenimiento',
        consumoElectricidad:       'Consumo eléctrico',
        consumoAgua:               'Consumo agua',
        esActivo:                  'Activo',
        capacidad:                 'Capacidad',
        ocupacion:                 'Ocupación',
        tieneCapacidadDisponible:  'Tiene espacio',
        consumoActualElectricidad: 'Consumo eléc. actual',
        consumoActualAgua:         'Consumo agua actual',
        empleo:                    'Puestos de trabajo',
        empleadosActuales:         'Empleados actuales',
        ingresoPorTurno:           'Ingreso por turno',
        tipoDeProduccion:          'Tipo de producción',
        produccionPorTurno:        'Producción por turno',
        tipoDeServicio:            'Tipo de servicio',
        felicidadAportada:         'Felicidad aportada',
        tipoDeUtilidad:            'Tipo de utilidad',
    };

    function mostrarPanelInfo(objeto) {
        document.getElementById('panel-info')?.remove();

        // Parques y Vias no tienen getInformacion()
        const info = typeof objeto.getInformacion === 'function'
            ? objeto.getInformacion()
            : { nombre: objeto.constructor.name, costo: objeto.costo };

        const panel = document.createElement('div');
        panel.id = 'panel-info';
        panel.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0d1b2a;
            border: 2px solid #2a9ed4;
            border-radius: 8px;
            min-width: 260px;
            max-width: 320px;
            z-index: 9999;
            font-family: 'Press Start 2P', monospace;
            font-size: 0.6rem;
            color: #e0f0ff;
            box-shadow: 0 4px 24px rgba(0,0,0,0.5);
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1a3a5c;
            padding: 10px 14px;
            border-bottom: 1px solid #2a9ed4;
        `;
        header.innerHTML = `
            <span style="color:#f9d342">${info.nombre ?? 'Edificio'}</span>
            <button id="btn-cerrar-panel" style="
                background:none; border:none; color:#e0f0ff;
                cursor:pointer; font-size:1rem; line-height:1; padding:0 4px;
            ">✕</button>
        `;

        const tabla = document.createElement('table');
        tabla.style.cssText = 'width:100%; border-collapse:collapse;';

        Object.entries(info).forEach(([clave, valor]) => {
            if (clave === 'id') return;
            const fila = document.createElement('tr');
            fila.style.borderBottom = '1px solid #1a3a5c';

            const tdClave = document.createElement('td');
            tdClave.style.cssText = 'padding:6px 10px; color:#7ecfe6;';
            tdClave.textContent = ETIQUETAS_INFO[clave] ?? clave;

            const tdValor = document.createElement('td');
            tdValor.style.cssText = 'padding:6px 10px; text-align:right;';
            tdValor.textContent = typeof valor === 'boolean' ? (valor ? '✅' : '❌') : valor;

            fila.appendChild(tdClave);
            fila.appendChild(tdValor);
            tabla.appendChild(fila);
        });

        panel.appendChild(header);
        panel.appendChild(tabla);
        document.body.appendChild(panel);

        document.getElementById('btn-cerrar-panel')
            .addEventListener('click', () => panel.remove());
    }

    /* ============================================================
       NOTIFICACIONES FLOTANTES
       Se muestran brevemente (3s) para confirmar o rechazar una acción.
    ============================================================ */
    function mostrarNotificacion(texto, tipo = 'info') {
        const colores = {
            exito: '#27ae60',
            error: '#e74c3c',
            info:  '#2a9ed4'
        };

        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colores[tipo] ?? colores.info};
            color: #fff;
            font-family: 'Press Start 2P', monospace;
            font-size: 0.55rem;
            padding: 10px 20px;
            border-radius: 6px;
            z-index: 9999;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
            animation: fadeInOut 3s forwards;
        `;
        notif.textContent = texto;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

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

    function applyTransform() {
        canvasWrap.style.transform =
            `translate(${panX}px, ${panY}px) scale(${scale})`;
        zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

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

    function showTooltip(e, text) {
        tooltip.textContent = text;
        tooltip.classList.add('visible');
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top  = (e.clientY - 32) + 'px';
    }

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
    function centerView() {
        const scene = document.getElementById('iso-scene');
        panX = (viewport.clientWidth  - scene.offsetWidth  * scale) / 2;
        panY = (viewport.clientHeight - scene.offsetHeight * scale) / 2;
    }

    /* ============================================================
       UTILIDAD: nombre legible por etiqueta (para tooltip)
    ============================================================ */
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

    /* ============================================================
       INIT — cargar JSONs → Juego + Mapa + GridRenderer
    ============================================================ */
    document.addEventListener('DOMContentLoaded', async function () {

        /* ----------------------------------------------------------
           1. Cargar todos los JSONs antes de cualquier interacción
        ---------------------------------------------------------- */
        await cargarJSONs();

        /* ----------------------------------------------------------
           2. Leer acción del menú y preparar Juego + Mapa
        ---------------------------------------------------------- */
        const juego  = new Juego();
        let   mapa   = null;
        let   tamano = 15;

        const accion    = localStorage.getItem(CLAVE_ACCION);
        const configRaw = localStorage.getItem(CLAVE_CONFIG_NUEVA);

        if (accion === 'continuar') {
            juego.cargarPartida();
            if (juego.ciudad && juego.ciudad.mapa) {
                mapa   = juego.ciudad.mapa;
                tamano = mapa.ancho;
            } else {
                console.warn('[grid] cargarPartida no produjo ciudad válida, usando mapa vacío.');
                mapa = new Mapa(15, 15);
                mapa.generarMatriz();
                tamano = 15;
            }
            localStorage.removeItem(CLAVE_ACCION);

        } else if (configRaw) {
            let config = {};
            try { config = JSON.parse(configRaw); } catch { config = {}; }

            tamano = (config.ancho >= 15 && config.ancho <= 30) ? config.ancho : 15;

            juego.crearCiudad({
                nombre:        config.nombre        || 'Mi Ciudad',
                alcalde:       config.alcalde       || 'Alcalde',
                ancho:         tamano,
                alto:          tamano,
                duracionTurno: config.duracionTurno || 10000,
                dineroInicial: config.dineroInicial || 50000,
                coordenadas:   config.regionNombre
                                   ? { nombre: config.regionNombre, id: config.regionId }
                                   : null,
            });

            mapa = juego.ciudad.mapa;
            mapa.generarMatriz();
            juego.guardarPartida();
            localStorage.removeItem(CLAVE_CONFIG_NUEVA);

        } else {
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
           3. Actualizar el texto del top bar
        ---------------------------------------------------------- */
        const gridInfo = document.getElementById('grid-info');
        if (gridInfo) {
            const nombreCiudad = juego.ciudad?.nombre ?? '';
            const alcalde      = juego.ciudad?.alcalde ?? '';
            gridInfo.textContent = nombreCiudad
                ? `${nombreCiudad} (${alcalde}) — ${tamano} × ${tamano}`
                : `Cuadrícula ${tamano} × ${tamano} — Vista Isométrica`;
        }

        /* ----------------------------------------------------------
           4. Crear GridRenderer con el Mapa de la ciudad
        ---------------------------------------------------------- */
        const renderer = new GridRenderer(mapa, {
            contenedorId: 'iso-grid',
            TW: 64,
            TD: 32,

            // ── LÓGICA DE CONSTRUCCIÓN ──────────────────────────────────
            onCeldaClick: (col, row, etiqueta) => {

                // Guardia: si no hay ciudad activa (acceso directo sin pasar por el menú)
                if (!juego.ciudad) {
                    juego.crearCiudad({
                        nombre: "Ciudad de Prueba",
                        alcalde: "Alcalde",
                        ancho: tamano,
                        alto: tamano,
                        dineroInicial: 50000,
                    });
                }

                // CASO 1: Celda ocupada → mostrar panel de información del objeto
                if (etiqueta !== 'g') {
                    // Buscar el objeto en ciudad.construcciones por su id (uid = tipo_col_row)
                    const objeto = juego.ciudad?.construcciones.find(
                        c => c.id === `${etiqueta}_${col}_${row}` ||
                             // Parques y Vías no tienen id, los identificamos por posición
                             // guardada en dataset del cubo (etiqueta + coordenadas)
                             (c.id?.endsWith(`_${col}_${row}`))
                    );
                    if (objeto) {
                        mostrarPanelInfo(objeto);
                    }
                    return;
                }

                // CASO 2: Celda vacía pero sin edificio seleccionado → no hacer nada
                const menuId = window.edificioSeleccionado;
                if (!menuId) return;

                // Obtener configuración del edificio seleccionado
                const config = Construccion.obtenerConfig(menuId);
                if (!config) return;

                // Crear la instancia con valores por defecto (dinámicos en 0 / [])
                const objeto = Construccion.instanciar(menuId, col, row, datosEdificios);
                if (!objeto) return;

                // VALIDACIÓN 1: dinero suficiente (via ciudad.construir → objeto.ejecutar)
                if (!objeto.puedeConstruirse(juego.ciudad)) {
                    mostrarNotificacion(
                        `💸 Sin fondos: necesitas $${objeto.costo}`,
                        'error'
                    );
                    return;
                }

                // VALIDACIÓN 2: intentar colocar en Mapa (valida celda vacía + vía adyacente)
                const exitoMapa = renderer.colocarElemento(col, row, config.etiqueta);
                if (!exitoMapa) {
                    // Mapa.agregarElemento devolvió false: celda ocupada o sin vía adyacente
                    const razon = mapa.celdaVacia(col, row)
                        ? '🚧 Necesita una vía adyacente'
                        : '🚫 Celda ocupada';
                    mostrarNotificacion(razon, 'error');
                    return;
                }

                // Todo OK: descontar dinero + registrar en ciudad.construcciones
                juego.ciudad.construir(objeto);

                // Guardar partida automáticamente
                juego.guardarPartida();

                mostrarNotificacion(
                    `✅ ${objeto.nombre ?? 'Construcción'} construido`,
                    'exito'
                );

                console.debug(
                    `[Build] ${config.etiqueta} en (${col},${row}) →`,
                    objeto.getInformacion?.() ?? objeto
                );
            }
            // ────────────────────────────────────────────────────────────
        });

        renderer.inicializar();

        /* ----------------------------------------------------------
           5. Tooltip
        ---------------------------------------------------------- */
        const gridEl = document.getElementById('iso-grid');

        gridEl.addEventListener('celda-enter', function (e) {
            if (isDragging) return;
            const { col, row, etiqueta, originalEvent } = e.detail;
            showTooltip(originalEvent, `(${col}, ${row}) — ${_nombreEtiqueta(etiqueta)}`);
        });

        gridEl.addEventListener('celda-leave', hideTooltip);

        /* ----------------------------------------------------------
           6. Guardar partida automáticamente cuando cambia el mapa
        ---------------------------------------------------------- */
        gridEl.addEventListener('celda-click', function () {
            if (juego.ciudad) {
                juego.ciudad.mapa = mapa;
                juego.guardarPartida();
                console.debug('[grid] Partida guardada automáticamente.');
            }
        });

        /* ----------------------------------------------------------
           7. Exponer globalmente para consola / módulos externos
        ---------------------------------------------------------- */
        window.juego        = juego;
        window.mapa         = mapa;
        window.gridRenderer = renderer;

        /* ----------------------------------------------------------
           8. Centrar vista
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