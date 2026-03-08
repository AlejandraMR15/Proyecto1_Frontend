/**
 * CIUDAD VIRTUAL — Cuadrícula Isométrica
 * grid.js
 *
 * Cada cubo se dibuja con un <svg> que contiene 3 polígonos
 * con coordenadas calculadas exactamente — sin skewY, sin huecos.
 *
 * Geometría isométrica real:
 *   - La cara TOP es un rombo (4 vértices).
 *   - La cara LEFT es un paralelogramo (4 vértices).
 *   - La cara RIGHT es un paralelogramo (4 vértices).
 *   Todos comparten vértices exactos → sin gaps.
 */

(function () {
    "use strict";

    /* ============================================================
       CONFIGURACIÓN
    ============================================================ */
    const GRID_COLS = 15;
    const GRID_ROWS = 15;

    // Ancho y alto de la CARA SUPERIOR (el rombo visto desde arriba).
    // En isometría real: el rombo tiene ancho W y alto W/2.
    const TW = 64;          // tile width  (ancho del rombo)
    const TH = TW / 2;      // tile height (alto del rombo) = 32
    const TD = 20;           // depth: altura visible de las caras laterales

    // Paso de posicionamiento entre celdas adyacentes
    const STEP_X = TW / 2;  // 32 px  (col +1 mueve este delta en X e Y)
    const STEP_Y = TH / 2;  // 16 px

    /* ============================================================
       ZOOM + PAN
    ============================================================ */
    const ZOOM_MIN   = 0.3;
    const ZOOM_MAX   = 3.0;
    const ZOOM_STEP  = 0.15;

    let scale  = 1.0;
    let panX   = 0;
    let panY   = 0;
    let isDragging = false;
    let lastMouse  = { x: 0, y: 0 };

    const viewport  = document.getElementById("viewport");
    const canvasWrap = document.getElementById("canvas-wrap");
    const zoomLabel  = document.getElementById("zoom-label");

    function applyTransform() {
        canvasWrap.style.transform =
            `translate(${panX}px, ${panY}px) scale(${scale})`;
        zoomLabel.textContent = Math.round(scale * 100) + "%";
    }

    /* Zoom centrado en el punto del viewport */
    function zoomAt(cx, cy, delta) {
        const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
        if (newScale === scale) return;
        // Ajustar pan para que el punto bajo el cursor quede fijo
        panX = cx - (cx - panX) * (newScale / scale);
        panY = cy - (cy - panY) * (newScale / scale);
        scale = newScale;
        applyTransform();
    }

    // Rueda del ratón → zoom
    viewport.addEventListener("wheel", function (e) {
        e.preventDefault();
        const rect  = viewport.getBoundingClientRect();
        const cx    = e.clientX - rect.left;
        const cy    = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        zoomAt(cx, cy, delta);
    }, { passive: false });

    // Botones de zoom
    document.getElementById("btn-zoom-in").addEventListener("click", function () {
        const cx = viewport.clientWidth  / 2;
        const cy = viewport.clientHeight / 2;
        zoomAt(cx, cy, ZOOM_STEP);
    });
    document.getElementById("btn-zoom-out").addEventListener("click", function () {
        const cx = viewport.clientWidth  / 2;
        const cy = viewport.clientHeight / 2;
        zoomAt(cx, cy, -ZOOM_STEP);
    });
    document.getElementById("btn-zoom-reset").addEventListener("click", function () {
        scale = 1.0;
        centerView();
        applyTransform();
    });

    /* ============================================================
       PAN (arrastrar con click sostenido)
    ============================================================ */
    viewport.addEventListener("mousedown", function (e) {
        // Solo pan si NO se hace clic sobre un cubo
        if (e.target.closest(".iso-cube")) return;
        isDragging = true;
        lastMouse  = { x: e.clientX, y: e.clientY };
        viewport.classList.add("dragging");
        e.preventDefault();
    });

    // Permitir pan también cuando se arrastra desde CUALQUIER parte
    // (incluyendo sobre cubos, si el mousedown empezó fuera)
    viewport.addEventListener("mousemove", function (e) {
        if (!isDragging) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        panX += dx;
        panY += dy;
        lastMouse = { x: e.clientX, y: e.clientY };
        applyTransform();
    });

    document.addEventListener("mouseup", function () {
        if (isDragging) {
            isDragging = false;
            viewport.classList.remove("dragging");
        }
    });

    // Touch: pan con un dedo, zoom con pinch
    let lastTouches = null;

    viewport.addEventListener("touchstart", function (e) {
        lastTouches = e.touches;
        e.preventDefault();
    }, { passive: false });

    viewport.addEventListener("touchmove", function (e) {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouches && lastTouches.length === 1) {
            const dx = e.touches[0].clientX - lastTouches[0].clientX;
            const dy = e.touches[0].clientY - lastTouches[0].clientY;
            panX += dx;
            panY += dy;
            applyTransform();
        } else if (e.touches.length === 2 && lastTouches && lastTouches.length === 2) {
            const dist = (t) => Math.hypot(
                t[0].clientX - t[1].clientX,
                t[0].clientY - t[1].clientY
            );
            const prevDist = dist(lastTouches);
            const currDist = dist(e.touches);
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = viewport.getBoundingClientRect();
            zoomAt(cx - rect.left, cy - rect.top, (currDist - prevDist) * 0.005);
        }
        lastTouches = e.touches;
    }, { passive: false });

    viewport.addEventListener("touchend", function (e) {
        lastTouches = e.touches;
    });

    /* ============================================================
       GEOMETRÍA DEL CUBO
    ============================================================ */
    /*
        Vértices del cubo en coordenadas locales (origen = esquina
        superior-izquierda del bounding box del SVG):

        El SVG tiene width = TW, height = TH + TD.

        Puntos clave (px = pixel exacto):
            A = (TW/2,  0      )   ← punta superior del rombo
            B = (TW,    TH/2   )   ← punta derecha
            C = (TW/2,  TH     )   ← punta inferior del rombo (= tope caras laterales)
            D = (0,     TH/2   )   ← punta izquierda

            E = (0,     TH/2 + TD) ← base izq-izquierda
            F = (TW/2,  TH    + TD)← base centro (punto bajo)
            G = (TW,    TH/2 + TD) ← base izq-derecha

        Cara TOP   : A → B → C → D
        Cara LEFT  : D → C → F → E
        Cara RIGHT : C → B → G → F
    */

    function makeCubeSVG(colorTop, colorLeft, colorRight) {
        const W  = TW;
        const H  = TH;
        const D  = TD;
        const svgW = W;
        const svgH = H + D;

        // Vértices
        const A = [W / 2,       0        ];
        const B = [W,           H / 2    ];
        const C = [W / 2,       H        ];
        const D2= [0,           H / 2    ];
        const E = [0,           H / 2 + D];
        const F = [W / 2,       H     + D];
        const G = [W,           H / 2 + D];

        function pts(arr) { return arr.map(p => p.join(",")).join(" "); }

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width",  svgW);
        svg.setAttribute("height", svgH);
        svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

        // Cara izquierda (más oscura)
        const left = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        left.setAttribute("points", pts([D2, C, F, E]));
        left.setAttribute("fill", colorLeft);
        left.classList.add("poly-left");

        // Cara derecha (más oscura aún)
        const right = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        right.setAttribute("points", pts([C, B, G, F]));
        right.setAttribute("fill", colorRight);
        right.classList.add("poly-right");

        // Cara superior (más clara) — se pinta encima
        const top = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        top.setAttribute("points", pts([A, B, C, D2]));
        top.setAttribute("fill", colorTop);
        top.classList.add("poly-top");

        svg.appendChild(left);
        svg.appendChild(right);
        svg.appendChild(top);

        return svg;
    }

    /* ============================================================
       POSICIONAMIENTO ISOMÉTRICO
    ============================================================ */
    /*
        Para la celda (col, row):
            screenX = (col - row) * STEP_X
            screenY = (col + row) * STEP_Y

        El div del cubo se posiciona en (screenX, screenY)
        dentro del iso-grid. El offsetX compensa las X negativas
        (las filas del fondo tienen x negativa).
    */
    function gridToScreen(col, row) {
        return {
            x: (col - row) * STEP_X,
            y: (col + row) * STEP_Y
        };
    }

    /* ============================================================
       CONSTRUCCIÓN DE LA CUADRÍCULA
    ============================================================ */
    function buildGrid() {
        const gridEl = document.getElementById("iso-grid");

        // Calcular offset para que ningún cubo quede con x < 0
        const minX = gridToScreen(0, GRID_ROWS - 1).x;   // más negativo
        const offsetX = -minX;

        // Dimensiones totales del iso-grid
        const maxX = gridToScreen(GRID_COLS - 1, 0).x + TW;
        const maxY = gridToScreen(GRID_COLS - 1, GRID_ROWS - 1).y + TH + TD;
        const totalW = maxX + offsetX;
        const totalH = maxY;

        gridEl.style.width  = totalW + "px";
        gridEl.style.height = totalH + "px";

        // Colores base de las tres caras
        const C_TOP   = "#7ecfe6";
        const C_LEFT  = "#4baec8";
        const C_RIGHT = "#2d8aaa";

        // Painter's algorithm: renderizar de atrás (row+col pequeño) hacia adelante
        const cells = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                cells.push({ row, col });
            }
        }
        cells.sort((a, b) => (a.row + a.col) - (b.row + b.col));

        cells.forEach(function ({ row, col }, idx) {
            const { x, y } = gridToScreen(col, row);

            const cube = document.createElement("div");
            cube.className = "iso-cube";
            cube.dataset.row = row;
            cube.dataset.col = col;
            cube.style.left   = (x + offsetX) + "px";
            cube.style.top    = y + "px";
            cube.style.width  = TW + "px";
            cube.style.height = (TH + TD) + "px";
            cube.style.zIndex = row + col;

            // Animación de entrada escalonada
            cube.style.opacity  = "0";
            cube.style.transition = "opacity 0.25s ease";

            const svg = makeCubeSVG(C_TOP, C_LEFT, C_RIGHT);
            cube.appendChild(svg);

            // Eventos
            cube.addEventListener("mouseenter", onEnter);
            cube.addEventListener("mouseleave", onLeave);
            cube.addEventListener("click",      onClick);

            gridEl.appendChild(cube);

            // Fade-in escalonado
            setTimeout(function () {
                cube.style.opacity = "1";
            }, idx * 3 + 50);
        });
    }

    /* ============================================================
       EVENTOS DE CELDA
    ============================================================ */
    let selectedCube = null;

    function onEnter(e) {
        if (isDragging) return;
        const cube = e.currentTarget;
        showTooltip(e,
            "Celda (" + cube.dataset.col + ", " + cube.dataset.row + ")"
        );
    }

    function onLeave() {
        hideTooltip();
    }

    function onClick(e) {
        if (isDragging) return;
        const cube = e.currentTarget;

        if (selectedCube && selectedCube !== cube) {
            selectedCube.classList.remove("selected");
        }

        if (selectedCube === cube) {
            cube.classList.remove("selected");
            selectedCube = null;
        } else {
            cube.classList.add("selected");
            selectedCube = cube;
        }
    }

    /* ============================================================
       TOOLTIP
    ============================================================ */
    const tooltip = document.getElementById("tooltip");

    function showTooltip(e, text) {
        tooltip.textContent = text;
        tooltip.classList.add("visible");
        moveTooltip(e);
    }

    function hideTooltip() {
        tooltip.classList.remove("visible");
    }

    function moveTooltip(e) {
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top  = (e.clientY - 32) + "px";
    }

    document.addEventListener("mousemove", function (e) {
        if (tooltip.classList.contains("visible")) {
            moveTooltip(e);
        }
    });

    /* ============================================================
       CENTRAR VISTA
    ============================================================ */
    function centerView() {
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        const scene = document.getElementById("iso-scene");
        const sw = scene.offsetWidth  * scale;
        const sh = scene.offsetHeight * scale;
        panX = (vw - sw) / 2;
        panY = (vh - sh) / 2;
    }

    /* ============================================================
       INIT
    ============================================================ */
    document.addEventListener("DOMContentLoaded", function () {
        buildGrid();
        setTimeout(function () {
            centerView();
            applyTransform();
        }, 80);
    });

})();
