/**
 * CIUDAD VIRTUAL — grid.js  (refactorizado)
 *
 * Este archivo ya NO contiene lógica de cuadrícula.
 * Su única responsabilidad es:
 *  1. Gestionar zoom + pan sobre el viewport.
 *  2. Instanciar Mapa y GridRenderer al cargar el DOM.
 *  3. Conectar el tooltip con los eventos que emite GridRenderer.
 *
 * Para colocar o eliminar elementos en el mapa, usar el objeto
 * `window.gridRenderer` expuesto globalmente:
 *
 *   window.gridRenderer.colocarElemento(col, row, 'r');
 *   window.gridRenderer.eliminarElemento(col, row);
 *   window.gridRenderer.obtenerEtiqueta(col, row);
 *
 * Y la instancia de Mapa siempre está sincronizada en:
 *   window.mapa
 */

import Mapa        from '../modelos/Mapa.js';
import GridRenderer from './GridRenderer.js';

(function () {
    "use strict";

    /* ============================================================
       ZOOM + PAN
    ============================================================ */
    const ZOOM_MIN  = 0.3;
    const ZOOM_MAX  = 3.0;
    const ZOOM_STEP = 0.15;

    let scale = 1.0;
    let panX  = 0;
    let panY  = 0;
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
            zoomAt(cx - rect.left, cy - rect.top, (dist(e.touches) - dist(lastTouches)) * 0.005);
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
       INIT — Mapa + GridRenderer
    ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {

        // 1. Crear el modelo lógico
        const mapa = new Mapa(15, 15);
        mapa.generarMatriz();   // llena toda la matriz con 'g'

        // 2. Crear el renderer y pasarle el modelo
        const renderer = new GridRenderer(mapa, {
            contenedorId: 'iso-grid',
            TW: 64,
            TD: 32,
            // Callback opcional: se ejecuta al hacer click en una celda.
            // Aquí podemos enchufar el sistema de construcción más adelante.
            onCeldaClick: (col, row, etiqueta) => {
                console.debug(`[Grid] click → col:${col} row:${row} etiqueta:"${etiqueta}"`);
                // TODO: en el futuro, aquí se leerá la herramienta seleccionada
                // en la UI y se llamará a renderer.colocarElemento(col, row, herramienta).
            }
        });

        renderer.inicializar();

        // 3. Suscribir tooltip a los eventos del grid
        const gridEl = document.getElementById('iso-grid');

        gridEl.addEventListener('celda-enter', function (e) {
            if (isDragging) return;
            const { col, row, etiqueta, originalEvent } = e.detail;
            const nombre = _nombreEtiqueta(etiqueta);
            showTooltip(originalEvent, `(${col}, ${row}) — ${nombre}`);
        });

        gridEl.addEventListener('celda-leave', hideTooltip);

        // 4. Exponer globalmente para uso desde consola / otros módulos
        window.mapa         = mapa;
        window.gridRenderer = renderer;

        // 5. Centrar y aplicar transform inicial
        setTimeout(function () {
            centerView();
            applyTransform();
        }, 80);

        console.info(
            '[CiudadVirtual] Listo. Usa window.gridRenderer.colocarElemento(col, row, etiqueta) para probar.'
        );
    });

    /* ============================================================
       Utilidad: nombre legible por etiqueta
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

})();
