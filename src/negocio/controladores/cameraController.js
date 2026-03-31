const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.15;

import { getRuntimeCss } from './runtimeCss.js';

/**
 * Configura zoom, pan y gestos touch del viewport isometrico.
 * @param {{
 *   viewport: HTMLElement,
 *   canvasWrap: HTMLElement,
 *   zoomLabel: HTMLElement,
 *   getRenderer: () => any
 * }} cfg
 */
export function crearControlCamara(cfg) {
    const { viewport, canvasWrap, zoomLabel, getRenderer } = cfg;
    const runtimeCss = getRuntimeCss('camera');

    let scale = 1.0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    let lastTouches = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const TAP_UMBRAL = window.matchMedia('(min-width: 768px)').matches ? 14 : 8;

    function applyTransform() {
        const scene = document.getElementById('iso-scene');
        if (scene) {
            const sw = scene.offsetWidth * scale;
            const sh = scene.offsetHeight * scale;
            const vw = viewport.clientWidth;
            const vh = viewport.clientHeight;
            const marginX = sw * 0.5;
            const marginY = sh * 0.5;
            panX = Math.min(marginX, Math.max(vw - sw - marginX, panX));
            panY = Math.min(marginY, Math.max(vh - sh - marginY, panY));
        }
        runtimeCss.setRule(
            'canvas-wrap-transform',
            `#canvas-wrap { transform: translate(${panX}px, ${panY}px) scale(${scale}); }`
        );
        if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

    function centerView() {
        const scene = document.getElementById('iso-scene');
        if (!scene) return;
        panX = (viewport.clientWidth - scene.offsetWidth * scale) / 2;
        panY = (viewport.clientHeight - scene.offsetHeight * scale) / 2;
    }

    function zoomAt(cx, cy, delta) {
        const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
        if (newScale === scale) return;
        panX = cx - (cx - panX) * (newScale / scale);
        panY = cy - (cy - panY) * (newScale / scale);
        scale = newScale;
        applyTransform();
    }

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, delta);
    }, { passive: false });

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
        zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, ZOOM_STEP);
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
        zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, -ZOOM_STEP);
    });

    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
        scale = 1.0;
        centerView();
        applyTransform();
    });

    viewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
        viewport.classList.add('dragging');
        e.preventDefault();
    });

    viewport.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX += e.clientX - lastMouse.x;
        panY += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        applyTransform();
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        viewport.classList.remove('dragging');
    });

    viewport.addEventListener('touchstart', (e) => {
        lastTouches = e.touches;
        touchMoved = false;
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouches?.length === 1) {
            const dx = e.touches[0].clientX - lastTouches[0].clientX;
            const dy = e.touches[0].clientY - lastTouches[0].clientY;
            if (!touchMoved) {
                const totalDx = e.touches[0].clientX - touchStartX;
                const totalDy = e.touches[0].clientY - touchStartY;
                if (Math.abs(totalDx) > TAP_UMBRAL || Math.abs(totalDy) > TAP_UMBRAL) {
                    touchMoved = true;
                }
            }
            panX += dx;
            panY += dy;
            applyTransform();
        } else if (e.touches.length === 2 && lastTouches?.length === 2) {
            const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = viewport.getBoundingClientRect();
            zoomAt(cx - rect.left, cy - rect.top, (dist(e.touches) - dist(lastTouches)) * 0.005);
            touchMoved = true;
        }
        lastTouches = e.touches;
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
        if (!touchMoved && e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            let el = document.elementFromPoint(t.clientX, t.clientY);
            while (el && el !== document.body) {
                if (el.classList && el.classList.contains('iso-cube')) break;
                if (el.tagName === 'BUTTON') break;
                if (el.classList && el.classList.contains('build-item')) break;
                el = el.parentElement;
            }

            if (el && el !== document.body) {
                e.preventDefault();
                if (el.classList.contains('iso-cube')) {
                    const renderer = getRenderer ? getRenderer() : null;
                    if (renderer && renderer._getMouseDown) {
                        const originalGetMouseDown = renderer._getMouseDown;
                        renderer._getMouseDown = () => ({ x: t.clientX, y: t.clientY });
                        el.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            clientX: t.clientX,
                            clientY: t.clientY,
                            view: window,
                        }));
                        renderer._getMouseDown = originalGetMouseDown;
                    } else {
                        el.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            clientX: t.clientX,
                            clientY: t.clientY,
                            view: window,
                        }));
                    }
                } else {
                    el.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        clientX: t.clientX,
                        clientY: t.clientY,
                        view: window,
                    }));
                }
            }
        }

        lastTouches = e.touches;
        touchMoved = false;
    });

    return {
        applyTransform,
        centerView,
        estaArrastrando: () => isDragging,
    };
}
