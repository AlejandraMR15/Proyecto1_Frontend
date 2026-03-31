const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.15;

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

    let scale = 1.0;
    let isDragging = false;
    let dragStartMouse = { x: 0, y: 0 };
    let dragStartScroll = { x: 0, y: 0 };

    let lastTouches = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const TAP_UMBRAL = window.matchMedia('(min-width: 768px)').matches ? 14 : 8;

    function _normalizarScale(value) {
        const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
        return Math.round(clamped * 20) / 20;
    }

    function _levelClassFromScale(value) {
        const pct = Math.round(value * 100);
        return `zoom-level-${pct}`;
    }

    function _setZoomClass(value) {
        const normalized = _normalizarScale(value);
        const prev = _levelClassFromScale(scale);
        const next = _levelClassFromScale(normalized);
        canvasWrap.classList.remove(prev);
        canvasWrap.classList.add(next);
        scale = normalized;
        if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

    function applyTransform() {
        _setZoomClass(scale);
    }

    function centerView() {
        const scene = document.getElementById('iso-scene');
        if (!scene) return;
        const targetX = Math.max(0, ((scene.offsetWidth * scale) - viewport.clientWidth) / 2);
        const targetY = Math.max(0, ((scene.offsetHeight * scale) - viewport.clientHeight) / 2);
        viewport.scrollLeft = targetX;
        viewport.scrollTop = targetY;
    }

    function zoomAt(cx, cy, delta) {
        const newScale = _normalizarScale(scale + delta);
        if (newScale === scale) return;
        const worldX = (viewport.scrollLeft + cx) / scale;
        const worldY = (viewport.scrollTop + cy) / scale;
        _setZoomClass(newScale);
        viewport.scrollLeft = Math.max(0, (worldX * scale) - cx);
        viewport.scrollTop = Math.max(0, (worldY * scale) - cy);
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
        _setZoomClass(1.0);
        centerView();
    });

    viewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartMouse = { x: e.clientX, y: e.clientY };
        dragStartScroll = { x: viewport.scrollLeft, y: viewport.scrollTop };
        viewport.classList.add('dragging');
        e.preventDefault();
    });

    viewport.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartMouse.x;
        const dy = e.clientY - dragStartMouse.y;
        viewport.scrollLeft = dragStartScroll.x - dx;
        viewport.scrollTop = dragStartScroll.y - dy;
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
            viewport.scrollLeft -= dx;
            viewport.scrollTop -= dy;
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
