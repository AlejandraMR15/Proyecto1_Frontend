/**
 * CIUDAD VIRTUAL — Cuadrícula Isométrica
 * grid.js
 *
 * Responsabilidades:
 *  - Renderizar la cuadrícula isométrica
 *  - Manejar zoom y pan
 *  - Leer los JSONs de edificios al iniciar
 *  - Crear objetos JS al construir en una celda
 *  - Guardar los objetos en la matrizLogica
 *  - Mostrar panel de info al hacer click en celda ocupada
 */

(function () {
    "use strict";

    /* ============================================================
       CONFIGURACIÓN
    ============================================================ */
    const GRID_COLS = 15;
    const GRID_ROWS = 15;

    const TW     = 64;
    const TH     = TW / 2;   // 32
    const TD     = 20;
    const STEP_X = TW / 2;   // 32
    const STEP_Y = TH / 2;   // 16

    /* ============================================================
       MATRIZ LÓGICA
       Paralela a la visual. Cada celda guarda:
         - null        → celda vacía
         - objeto JS   → edificio construido (Residencial, Comercial, etc.)
    ============================================================ */
    const matrizLogica = Array.from(
        { length: GRID_ROWS },
        () => Array(GRID_COLS).fill(null)
    );

    /* ============================================================
       CARGA DE JSONs
       Se hace UNA sola vez al inicio (DOMContentLoaded).
       datosEdificios['comercial'] = [{tienda...}, {centroComercial...}]
    ============================================================ */
    const datosEdificios = {};

    async function cargarJSONs() {
        // Ajusta la ruta si tus JSONs están en otra carpeta
        const BASE = '../../datos/'; // Proyecto1_Frontend/datos/
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
       MAPA: data-id del menú → qué JSON usar y qué índice
    ============================================================ */
    const MAPA_EDIFICIOS = {
        'res-001':    { json: 'residencial',     indice: 0 },
        'res-002':    { json: 'residencial',     indice: 1 },
        'com-001':    { json: 'comercial',       indice: 0 },
        'com-002':    { json: 'comercial',       indice: 1 },
        'ind-001':    { json: 'industrial',      indice: 0 },
        'ind-002':    { json: 'industrial',      indice: 1 },
        'serv-001':   { json: 'servicio',        indice: 0 },
        'serv-002':   { json: 'servicio',        indice: 1 },
        'serv-003':   { json: 'servicio',        indice: 2 },
        'util-001':   { json: 'plantasUtilidad', indice: 0 },
        'util-002':   { json: 'plantasUtilidad', indice: 1 },
        'parque-001': { json: 'parques',         indice: 0 },
        'via-001':    { json: 'vias',            indice: 0 },
    };

    /* ============================================================
       FÁBRICA DE EDIFICIOS
       Lee los datos del JSON ya cargado y crea el objeto JS correcto.
       El id único combina el id base + coordenadas (ej: "com-001_3_5")
    ============================================================ */
    function crearEdificio(menuId, col, row) {
        const config = MAPA_EDIFICIOS[menuId];
        if (!config) return null;

        const d   = datosEdificios[config.json][config.indice];
        const uid = `${d.id ?? menuId}_${col}_${row}`;

        switch (config.json) {
            case 'residencial':
                return new Residencial(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento, d.consumoElectricidad, d.consumoAgua,
                    d.esActivo, d.capacidad, []
                );

            case 'comercial':
                return new Comercial(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento, d.consumoElectricidad,
                    d.esActivo, d.empleo, [], d.ingresoPorTurno
                );

            case 'industrial':
                return new Industrial(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento, d.consumoElectricidad, d.consumoAgua ?? 0,
                    d.esActivo, d.empleo, [], d.montonDeProduccion
                );

            case 'servicio':
                return new Servicio(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento, d.esActivo,
                    d.tipoDeServicio, d.felicidad
                );

            case 'plantasUtilidad':
                return new PlantasDeUtilidad(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento, d.esActivo,
                    d.tipoDeUtilidad, d.produccionPorTurno
                );

            case 'parques':
                return new Parques(d.costo, d.felicidad);

            case 'vias':
                return new Vias(d.costo);

            default:
                return null;
        }
    }

    /* ============================================================
       COLORES POR TIPO DE EDIFICIO
    ============================================================ */
    const COLORES_EDIFICIO = {
        'res-001':    { top: '#f9d342', left: '#c8a400', right: '#a07800' },
        'res-002':    { top: '#f9d342', left: '#c8a400', right: '#a07800' },
        'com-001':    { top: '#5bc8f5', left: '#2a9ed4', right: '#1a7aaa' },
        'com-002':    { top: '#5bc8f5', left: '#2a9ed4', right: '#1a7aaa' },
        'ind-001':    { top: '#b0b0b0', left: '#808080', right: '#606060' },
        'ind-002':    { top: '#a8d45a', left: '#6aaa1a', right: '#4a8a00' },
        'serv-001':   { top: '#6699ff', left: '#3366cc', right: '#1a44aa' },
        'serv-002':   { top: '#ff6633', left: '#cc3300', right: '#aa1100' },
        'serv-003':   { top: '#ff99cc', left: '#cc5588', right: '#aa2266' },
        'util-001':   { top: '#ffee44', left: '#ccaa00', right: '#aa8800' },
        'util-002':   { top: '#44ccff', left: '#0099cc', right: '#006699' },
        'parque-001': { top: '#55dd55', left: '#229922', right: '#116611' },
        'via-001':    { top: '#aaaaaa', left: '#666666', right: '#444444' },
    };

    /* ============================================================
       PINTAR EDIFICIO EN EL CUBO VISUAL
    ============================================================ */
    function pintarEdificio(cube, menuId) {
        const colores = COLORES_EDIFICIO[menuId];
        if (!colores) return;
        cube.querySelector('.poly-top').setAttribute('fill',   colores.top);
        cube.querySelector('.poly-left').setAttribute('fill',  colores.left);
        cube.querySelector('.poly-right').setAttribute('fill', colores.right);
        // Guardar el menuId en el cubo para poder leerlo después si hace falta
        cube.dataset.menuId = menuId;
    }

    /* ============================================================
       PANEL DE INFORMACIÓN DEL EDIFICIO
       Se muestra al hacer click en una celda ocupada.
       Usa getInformacion() de cada clase para obtener los datos.
    ============================================================ */

    // Nombres legibles para las claves de getInformacion()
    const ETIQUETAS = {
        id:                        'ID',
        nombre:                    'Nombre',
        costo:                     'Costo',
        costoMantenimiento:        'Mantenimiento',
        consumoElectricidad:       'Consumo eléctrico',
        consumoAgua:               'Consumo agua',
        esActivo:                  'Activo',
        capacidad:                 'Capacidad',
        ocupacion:                 'Ocupación actual',
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

    function mostrarPanelInfo(edificio) {
        // Eliminar panel previo si existe
        const previo = document.getElementById('panel-info');
        if (previo) previo.remove();

        const info = edificio.getInformacion
            ? edificio.getInformacion()
            : { nombre: 'Sin info' };

        const panel = document.createElement('div');
        panel.id = 'panel-info';
        panel.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0d1b2a;
            border: 2px solid #2a9ed4;
            border-radius: 8px;
            padding: 0;
            min-width: 260px;
            max-width: 320px;
            z-index: 9999;
            font-family: 'Press Start 2P', monospace;
            font-size: 0.6rem;
            color: #e0f0ff;
            box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        `;

        // Header del panel
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1a3a5c;
            padding: 10px 14px;
            border-radius: 6px 6px 0 0;
            border-bottom: 1px solid #2a9ed4;
        `;
        header.innerHTML = `
            <span style="color:#f9d342; font-size:0.65rem">${info.nombre ?? 'Edificio'}</span>
            <button id="btn-cerrar-panel" style="
                background: none;
                border: none;
                color: #e0f0ff;
                cursor: pointer;
                font-size: 1rem;
                line-height: 1;
                padding: 0 4px;
            ">✕</button>
        `;

        // Tabla de datos
        const tabla = document.createElement('table');
        tabla.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            padding: 8px;
        `;

        Object.entries(info).forEach(([clave, valor]) => {
            // Omitir el id porque ya está en el header
            if (clave === 'id') return;

            const fila = document.createElement('tr');
            fila.style.borderBottom = '1px solid #1a3a5c';

            const tdClave = document.createElement('td');
            tdClave.style.cssText = 'padding: 6px 10px; color: #7ecfe6;';
            tdClave.textContent = ETIQUETAS[clave] ?? clave;

            const tdValor = document.createElement('td');
            tdValor.style.cssText = 'padding: 6px 10px; text-align: right;';
            // Formato especial para booleanos
            if (typeof valor === 'boolean') {
                tdValor.textContent = valor ? '✅' : '❌';
            } else {
                tdValor.textContent = valor;
            }

            fila.appendChild(tdClave);
            fila.appendChild(tdValor);
            tabla.appendChild(fila);
        });

        panel.appendChild(header);
        panel.appendChild(tabla);
        document.body.appendChild(panel);

        // Cerrar panel
        document.getElementById('btn-cerrar-panel').addEventListener('click', () => {
            panel.remove();
        });
    }

    /* ============================================================
       ZOOM + PAN
    ============================================================ */
    const ZOOM_MIN  = 0.3;
    const ZOOM_MAX  = 3.0;
    const ZOOM_STEP = 0.15;

    let scale  = 1.0;
    let panX   = 0;
    let panY   = 0;
    let isDragging = false;
    let lastMouse  = { x: 0, y: 0 };

    const viewport   = document.getElementById("viewport");
    const canvasWrap = document.getElementById("canvas-wrap");
    const zoomLabel  = document.getElementById("zoom-label");

    function applyTransform() {
        canvasWrap.style.transform =
            `translate(${panX}px, ${panY}px) scale(${scale})`;
        zoomLabel.textContent = Math.round(scale * 100) + "%";
    }

    function zoomAt(cx, cy, delta) {
        const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
        if (newScale === scale) return;
        panX = cx - (cx - panX) * (newScale / scale);
        panY = cy - (cy - panY) * (newScale / scale);
        scale = newScale;
        applyTransform();
    }

    viewport.addEventListener("wheel", function (e) {
        e.preventDefault();
        const rect  = viewport.getBoundingClientRect();
        const cx    = e.clientX - rect.left;
        const cy    = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        zoomAt(cx, cy, delta);
    }, { passive: false });

    document.getElementById("btn-zoom-in").addEventListener("click", function () {
        zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, ZOOM_STEP);
    });
    document.getElementById("btn-zoom-out").addEventListener("click", function () {
        zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, -ZOOM_STEP);
    });
    document.getElementById("btn-zoom-reset").addEventListener("click", function () {
        scale = 1.0;
        centerView();
        applyTransform();
    });

    /* ============================================================
       PAN
    ============================================================ */
    viewport.addEventListener("mousedown", function (e) {
        if (e.target.closest(".iso-cube")) return;
        isDragging = true;
        lastMouse  = { x: e.clientX, y: e.clientY };
        viewport.classList.add("dragging");
        e.preventDefault();
    });

    viewport.addEventListener("mousemove", function (e) {
        if (!isDragging) return;
        panX += e.clientX - lastMouse.x;
        panY += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        applyTransform();
    });

    document.addEventListener("mouseup", function () {
        if (isDragging) {
            isDragging = false;
            viewport.classList.remove("dragging");
        }
    });

    // Touch
    let lastTouches = null;

    viewport.addEventListener("touchstart", function (e) {
        lastTouches = e.touches;
        e.preventDefault();
    }, { passive: false });

    viewport.addEventListener("touchmove", function (e) {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouches && lastTouches.length === 1) {
            panX += e.touches[0].clientX - lastTouches[0].clientX;
            panY += e.touches[0].clientY - lastTouches[0].clientY;
            applyTransform();
        } else if (e.touches.length === 2 && lastTouches && lastTouches.length === 2) {
            const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = viewport.getBoundingClientRect();
            zoomAt(cx - rect.left, cy - rect.top, (dist(e.touches) - dist(lastTouches)) * 0.005);
        }
        lastTouches = e.touches;
    }, { passive: false });

    viewport.addEventListener("touchend", function (e) {
        lastTouches = e.touches;
    });

    /* ============================================================
       GEOMETRÍA DEL CUBO
    ============================================================ */
    function makeCubeSVG(colorTop, colorLeft, colorRight) {
        const W    = TW;
        const H    = TH;
        const D    = TD;
        const svgW = W;
        const svgH = H + D;

        const A  = [W / 2,       0        ];
        const B  = [W,           H / 2    ];
        const C  = [W / 2,       H        ];
        const D2 = [0,           H / 2    ];
        const E  = [0,           H / 2 + D];
        const F  = [W / 2,       H     + D];
        const G  = [W,           H / 2 + D];

        function pts(arr) { return arr.map(p => p.join(",")).join(" "); }

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width",   svgW);
        svg.setAttribute("height",  svgH);
        svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

        const left = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        left.setAttribute("points", pts([D2, C, F, E]));
        left.setAttribute("fill", colorLeft);
        left.classList.add("poly-left");

        const right = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        right.setAttribute("points", pts([C, B, G, F]));
        right.setAttribute("fill", colorRight);
        right.classList.add("poly-right");

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

        const minX    = gridToScreen(0, GRID_ROWS - 1).x;
        const offsetX = -minX;

        const maxX   = gridToScreen(GRID_COLS - 1, 0).x + TW;
        const maxY   = gridToScreen(GRID_COLS - 1, GRID_ROWS - 1).y + TH + TD;
        const totalW = maxX + offsetX;
        const totalH = maxY;

        gridEl.style.width  = totalW + "px";
        gridEl.style.height = totalH + "px";

        const C_TOP   = "#7ecfe6";
        const C_LEFT  = "#4baec8";
        const C_RIGHT = "#2d8aaa";

        // Painter's algorithm
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
            cube.className        = "iso-cube";
            cube.dataset.row      = row;
            cube.dataset.col      = col;
            cube.style.left       = (x + offsetX) + "px";
            cube.style.top        = y + "px";
            cube.style.width      = TW + "px";
            cube.style.height     = (TH + TD) + "px";
            cube.style.zIndex     = row + col;
            cube.style.opacity    = "0";
            cube.style.transition = "opacity 0.25s ease";

            const svg = makeCubeSVG(C_TOP, C_LEFT, C_RIGHT);
            cube.appendChild(svg);

            cube.addEventListener("mouseenter", onEnter);
            cube.addEventListener("mouseleave", onLeave);
            cube.addEventListener("click",      onClick);

            gridEl.appendChild(cube);

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
        showTooltip(e, "Celda (" + cube.dataset.col + ", " + cube.dataset.row + ")");
    }

    function onLeave() {
        hideTooltip();
    }

    function onClick(e) {
        if (isDragging) return;

        const cube = e.currentTarget;
        const col  = parseInt(cube.dataset.col);
        const row  = parseInt(cube.dataset.row);

        // CASO 1: Celda ocupada → mostrar panel de información del edificio
        if (matrizLogica[row][col] !== null) {
            mostrarPanelInfo(matrizLogica[row][col]);
            return;
        }

        // CASO 2: Celda vacía + hay edificio seleccionado en el menú → construir
        if (window.edificioSeleccionado) {
            const edificio = crearEdificio(window.edificioSeleccionado, col, row);
            if (!edificio) return;

            // Guardar el objeto JS en la matriz lógica
            matrizLogica[row][col] = edificio;

            // Pintar el cubo visualmente con los colores del tipo de edificio
            pintarEdificio(cube, window.edificioSeleccionado);
            return;
        }

        // CASO 3: Sin edificio seleccionado → selección simple de celda
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
        if (tooltip.classList.contains("visible")) moveTooltip(e);
    });

    /* ============================================================
       CENTRAR VISTA
    ============================================================ */
    function centerView() {
        const vw    = viewport.clientWidth;
        const vh    = viewport.clientHeight;
        const scene = document.getElementById("iso-scene");
        panX = (vw - scene.offsetWidth  * scale) / 2;
        panY = (vh - scene.offsetHeight * scale) / 2;
    }

    /* ============================================================
       INIT — carga JSONs primero, luego construye la grilla
    ============================================================ */
    document.addEventListener("DOMContentLoaded", async function () {
        await cargarJSONs();
        buildGrid();
        setTimeout(function () {
            centerView();
            applyTransform();
        }, 80);
    });

})();