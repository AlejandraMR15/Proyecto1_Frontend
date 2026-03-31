/**
 * CIUDAD VIRTUAL — GridRenderer.js
 *
 * Puente entre el modelo lógico (Mapa) y la representación visual isométrica (DOM).
 *
 * Responsabilidades:
 *  - Construir y renderizar la cuadrícula isométrica en el DOM.
 *  - Leer el estado de Mapa.matriz para decidir qué pintar en cada celda.
 *  - Propagar al modelo (Mapa) cualquier interacción del usuario sobre el grid.
 *  - Exponer una API pública mínima para que código externo pueda:
 *      · colocar / eliminar elementos y reflejarlos tanto en Mapa como en el DOM.
 *      · consultar la etiqueta lógica de una celda.
 *
 * Principio de diseño:
 *  La ÚNICA fuente de verdad es Mapa.matriz.
 *  El DOM es un espejo de esa matriz; nunca almacena estado propio.
 *
 * Uso básico:
 *  const mapa = new Mapa(15, 15);
 *  mapa.generarMatriz();
 *  const renderer = new GridRenderer(mapa, { contenedorId: 'iso-grid' });
 *  renderer.inicializar();
 */

import Mapa from '../../modelos/Mapa.js';
import { coloresPorEtiqueta, crearSVGCelda, esEdificio } from './gridRendererVisuals.js';
import { getRuntimeCss } from './runtimeCss.js';

export default class GridRenderer {

    /* ------------------------------------------------------------------ */
    /*  Constructor                                                          */
    /* ------------------------------------------------------------------ */

    /**
     * @param {Mapa}   mapa     - Instancia del modelo lógico.
     * @param {object} [opciones]
     * @param {string} [opciones.contenedorId='iso-grid']   - id del div donde vive la grilla.
     * @param {number} [opciones.TW=64]    - Ancho del tile isométrico en px.
     * @param {number} [opciones.TD=32]    - Profundidad (altura) de las caras laterales en px.
     * @param {function} [opciones.onCeldaClick]  - Callback opcional: (col, row, etiqueta) => void
     */
    constructor(mapa, opciones = {}) {
        if (!(mapa instanceof Mapa)) {
            throw new TypeError('GridRenderer: se esperaba una instancia de Mapa.');
        }

        this.mapa = mapa;

        // Opciones con valores por defecto
        const {
            contenedorId  = 'iso-grid',
            TW            = 64,
            TD            = 32,
            onCeldaClick  = null,
        } = opciones;

        this.contenedorId = contenedorId;
        this.TW = TW;
        this.TH = TW / 2;   // altura del rombo superior
        this.TD = TD;        // profundidad de las caras laterales
        this.onCeldaClick = onCeldaClick;

        // Pasos de posicionamiento isométrico
        this.STEP_X = TW / 2;
        this.STEP_Y = TW / 4;

        // Referencia al div contenedor (se resuelve en inicializar())
        this._gridEl = null;

        // Mapa inverso: clave "col,row" → elemento div del cubo
        // Permite actualizaciones O(1) sin recorrer el DOM.
        this._cubos = new Map();

        // Contenedor para las burbujas de recursos
        this._burbujesEl = null;

        // Offset X guardado en tiempo de construcción para usar en animaciones
        this._offsetX = 0;

        this._runtimeCss = getRuntimeCss('grid-renderer');
        this._burbujaSeq = 0;

        this._runtimeCss.setRule(
            'svg-top-plano',
            `.iso-cube-svg.iso-svg-plano { top: -${this.TD}px; }`
        );
        this._runtimeCss.setRule(
            'svg-top-edificio',
            `.iso-cube-svg.iso-svg-edificio { top: -${this.TH / 2}px; }`
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Ciclo de vida                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Construye la cuadrícula completa en el DOM a partir del estado actual de Mapa.
     * Debe llamarse una sola vez al inicio (o tras un reset completo).
     */
    inicializar() {
        this._gridEl = document.getElementById(this.contenedorId);
        if (!this._gridEl) {
            throw new Error(`GridRenderer: no se encontró el elemento #${this.contenedorId}`);
        }

        // Crear contenedor para las burbujas de recursos como overlay fijo en el body.
        // Debe estar fuera del canvas-wrap para no verse afectado por overflow:hidden
        // del viewport, y para que las coordenadas sean relativas a la pantalla.
        const existente = document.getElementById('burbujas-recursos');
        if (existente) existente.remove();
        this._burbujesEl = document.createElement('div');
        this._burbujesEl.id = 'burbujas-recursos';
        document.body.appendChild(this._burbujesEl);

        // Aseguramos que Mapa tenga una matriz generada
        if (!Array.isArray(this.mapa.matriz) || this.mapa.matriz.length === 0) {
            this.mapa.generarMatriz();
        }

        this._construirGrid();
        this._construirBloqueVolumen();
        this._registrarEventosGrid();
    }

    /**
     * Destruye todos los cubos del DOM y limpia el mapa interno.
     * Útil para re-renderizar desde cero (p. ej. tras cargar partida).
     */
    destruir() {
        if (this._gridEl) this._gridEl.innerHTML = '';
        this._cubos.clear();
    }

    /**
     * Re-renderiza completamente la cuadrícula leyendo Mapa.matriz de nuevo.
     * Equivale a destruir() + inicializar().
     */
    refrescar() {
        this.destruir();
        this._construirGrid();
    }

    /* ------------------------------------------------------------------ */
    /*  API pública de interacción                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Intenta colocar una etiqueta en la celda (col, row).
     * Delega la validación a Mapa.agregarElemento().
     * Si tiene éxito, actualiza el DOM de esa celda.
     *
     * @param {number} col       - Columna (eje X lógico).
     * @param {number} row       - Fila    (eje Y lógico).
     * @param {string} etiqueta  - Tipo de construcción ('r', 'R1', 'C1', etc.)
     * @returns {boolean}        - true si se colocó, false si la lógica lo rechazó.
     */
    colocarElemento(col, row, etiqueta) {
        const exito = this.mapa.agregarElemento(col, row, etiqueta);
        if (exito) {
            this._actualizarCubo(col, row);
        }
        return exito;
    }

    /**
     * Elimina el elemento en la celda (col, row) y la deja como terreno ('g').
     * Delega en Mapa.eliminarElemento() y luego actualiza el DOM.
     *
     * @param {number} col
     * @param {number} row
     * @returns {string|false} - Etiqueta previa o false si estaba fuera de límites.
     */
    eliminarElemento(col, row) {
        const previo = this.mapa.eliminarElemento(col, row);
        if (previo !== false) {
            this._actualizarCubo(col, row);
        }
        return previo;
    }

    /**
     * Devuelve la etiqueta lógica que tiene la celda en Mapa.matriz.
     * @param {number} col
     * @param {number} row
     * @returns {string|null}
     */
    obtenerEtiqueta(col, row) {
        if (!this.mapa._inBounds(col, row)) return null;
        return this.mapa.matriz[row][col];
    }

    /* ------------------------------------------------------------------ */
    /*  Construcción interna del DOM                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Genera todos los cubos y los inserta en el DOM.
     * Aplica Painter's Algorithm para orden de renderizado correcto.
     * @private
     */
    _construirGrid() {
        const cols = this.mapa.ancho;
        const rows = this.mapa.alto;

        // Offset para que ningún cubo tenga x < 0
        const minX = this._gridToScreen(0, rows - 1).x;
        this._offsetX = -minX;

        // Dimensiones totales del contenedor
        const maxX = this._gridToScreen(cols - 1, 0).x + this.TW;
        const maxY = this._gridToScreen(cols - 1, rows - 1).y + this.TH + this.TD;
        this._gridWidthPx = maxX + this._offsetX;
        this._gridHeightPx = maxY;

        this._runtimeCss.setRule(
            'grid-size',
            `#${this.contenedorId} { width: ${this._gridWidthPx}px; height: ${this._gridHeightPx}px; }`
        );

        // Painter's Algorithm: renderizar de menor a mayor (col + row)
        const celdas = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                celdas.push({ row, col });
            }
        }
        celdas.sort((a, b) => (a.row + a.col) - (b.row + b.col));

        celdas.forEach(({ row, col }, idx) => {
            const cubo = this._crearCubo(col, row, this._offsetX, idx);
            this._gridEl.appendChild(cubo);
            this._cubos.set(`${col},${row}`, cubo);
        });

        // Tiempo en que termina de cargarse el último cubo (mismo cálculo que en _crearCubo)
        this._tiempoUltimoCubo = (celdas.length - 1) * 3 + 50;
    }

    /**
     * Crea un SVG decorativo detrás del grid que da la ilusión de un bloque
     * con volumen (cara izquierda, cara derecha y cara frontal en marrón tierra).
     * No afecta eventos ni lógica — puramente visual.
     * @private
     */
    _construirBloqueVolumen() {
        const cols  = this.mapa.ancho;
        const rows  = this.mapa.alto;
        const TD    = this.TD;
        const TW    = this.TW;
        const TH    = this.TH;
        const depth = 110;

        // El div de cada celda se posiciona en:
        //   left = (col-row)*STEP_X + _offsetX
        //   top  = (col+row)*STEP_Y + TD   (TD porque el div está desplazado)
        // Los vértices del diamante dentro del div son:
        //   Tope     = [TW/2, 0]
        //   Derecha  = [TW,   TH/2]
        //   Fondo    = [TW/2, TH]
        //   Izquierda= [0,    TH/2]
        // En coordenadas absolutas del #iso-grid:

        const dX = (col, row) => (col - row) * this.STEP_X + this._offsetX;
        const dY = (col, row) => (col + row) * this.STEP_Y + TD;

        // Pico DERECHO: vértice derecho del diamante de la celda (cols-1, 0)
        const rc = { x: dX(cols-1, 0) + TW,      y: dY(cols-1, 0) + TH / 2 };
        // Pico INFERIOR: vértice fondo del diamante de la celda (cols-1, rows-1)
        const bc = { x: dX(cols-1, rows-1) + TW/2, y: dY(cols-1, rows-1) + TH };
        // Pico IZQUIERDO: vértice izquierdo del diamante de la celda (0, rows-1)
        const lc = { x: dX(0, rows-1) + 0,         y: dY(0, rows-1) + TH / 2 };

        const faceLeft = [
            `${lc.x},${lc.y}`,
            `${bc.x},${bc.y}`,
            `${bc.x},${bc.y + depth}`,
            `${lc.x},${lc.y + depth}`
        ].join(' ');

        const faceRight = [
            `${bc.x},${bc.y}`,
            `${rc.x},${rc.y}`,
            `${rc.x},${rc.y + depth}`,
            `${bc.x},${bc.y + depth}`
        ].join(' ');

        const svgW = this._gridWidthPx || 2000;
        const svgH = (this._gridHeightPx || 0) + depth + 20;

        const ns  = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.id = 'iso-volume';
        svg.setAttribute('width',   svgW);
        svg.setAttribute('height',  svgH);
        svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

        const mkPoly = (points, fill, stroke) => {
            const p = document.createElementNS(ns, 'polygon');
            p.setAttribute('points',          points);
            p.setAttribute('fill',            fill);
            p.setAttribute('stroke',          stroke);
            p.setAttribute('stroke-width',    '1.5');
            p.setAttribute('stroke-linejoin', 'round');
            return p;
        };

        svg.appendChild(mkPoly(faceLeft,  '#7a3b1e', '#3d1a08'));
        svg.appendChild(mkPoly(faceRight, '#9b4f28', '#3d1a08'));

        if (this._gridEl.firstChild) {
            this._gridEl.insertBefore(svg, this._gridEl.firstChild);
        } else {
            this._gridEl.appendChild(svg);
        }

        const delay = (this._tiempoUltimoCubo ?? 50) + 80;
        setTimeout(() => { svg.classList.add('visible'); }, delay);
    }

    /**
     * Crea el elemento div de un cubo isométrico para la celda (col, row).
     * Lee la etiqueta actual de Mapa para asignar los colores correctos.
     * @private
     */
    _crearCubo(col, row, offsetX, idx) {
        const { x, y } = this._gridToScreen(col, row);
        const etiqueta = this.mapa.matriz[row][col] ?? 'g';

        // Wrapper: posicionado en la cara INFERIOR (poly-bottom)
        // poly-bottom empieza en y + TD dentro del SVG, y tiene alto TH
        // Al mover el div TD píxeles hacia abajo y reducir su alto a TH,
        // el bounding box coincide exactamente con el diamante visible.
        const cubo = document.createElement('div');
        cubo.className = 'iso-cube';
        cubo.dataset.col = col;
        cubo.dataset.row = row;
        cubo.dataset.etiqueta = etiqueta;
        cubo.classList.add(this._asegurarClasePosicionCubo(col, row, x + offsetX, y + this.TD, row + col));

        const colores = coloresPorEtiqueta(etiqueta);
        const svg = crearSVGCelda({
            TW: this.TW,
            TH: this.TH,
            TD: this.TD,
            colorTop: colores.top,
            colorLeft: colores.left,
            colorRight: colores.right,
            etiqueta,
        });
        svg.classList.add(esEdificio(etiqueta) ? 'iso-svg-edificio' : 'iso-svg-plano');
        cubo.appendChild(svg);

        // Eventos directamente en el cubo — el bounding box ya coincide con poly-bottom
        cubo.addEventListener('mouseenter', (e) => this._onEnter(e));
        cubo.addEventListener('mouseleave', ()  => this._onLeave());
        cubo.addEventListener('click',      (e) => this._onClick(e));

        // Fade-in escalonado
        setTimeout(() => { cubo.classList.add('loaded'); }, idx * 3 + 50);

        return cubo;
    }

    /* ------------------------------------------------------------------ */
    /*  Actualización reactiva de una celda                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Actualiza los polígonos SVG del cubo de (col, row) según el estado
     * actual de Mapa.matriz. No mueve el cubo, solo repinta sus caras.
     * @private
     */
    _actualizarCubo(col, row) {
        const clave = `${col},${row}`;
        const cubo  = this._cubos.get(clave);
        if (!cubo) return;

        const etiqueta = this.mapa.matriz[row][col] ?? 'g';
        cubo.dataset.etiqueta = etiqueta;

        const colores = coloresPorEtiqueta(etiqueta);

        // Limpiar contenido anterior (ya no usamos imágenes)
        cubo.innerHTML = '';

        const svg = crearSVGCelda({
            TW: this.TW,
            TH: this.TH,
            TD: this.TD,
            colorTop: colores.top,
            colorLeft: colores.left,
            colorRight: colores.right,
            etiqueta,
        });
        svg.classList.add(esEdificio(etiqueta) ? 'iso-svg-edificio' : 'iso-svg-plano');
        cubo.appendChild(svg);

        // Efecto visual breve para indicar el cambio
        this._animarCambio(cubo);
    }

    /**
     * Aplica un flash visual rápido al cubo para indicar que fue modificado.
     * @private
     */
    _animarCambio(cubo) {
        cubo.classList.add('iso-cube--cambio');
        setTimeout(() => {
            cubo.classList.remove('iso-cube--cambio');
        }, 250);
    }

    _asegurarClasePosicionCubo(col, row, left, top, zIndex) {
        const className = `iso-cube-pos-${col}-${row}`;
        const ruleKey = `iso-cube-pos-${col}-${row}`;
        this._runtimeCss.setRule(
            ruleKey,
            `.${className} { left: ${left}px; top: ${top}px; width: ${this.TW}px; height: ${this.TH}px; z-index: ${zIndex}; }`
        );
        return className;
    }

    _leerEscalaCanvas(canvasWrap) {
        if (!canvasWrap) return 1;
        const transform = window.getComputedStyle(canvasWrap).transform;
        if (!transform || transform === 'none') return 1;
        const match2d = transform.match(/^matrix\(([^)]+)\)$/);
        if (!match2d) return 1;
        const vals = match2d[1].split(',').map(v => parseFloat(v.trim()));
        if (vals.length < 2) return 1;
        const a = vals[0] || 1;
        const b = vals[1] || 0;
        return Math.sqrt((a * a) + (b * b));
    }

    /* ------------------------------------------------------------------ */
    /*  Proyección isométrica                                                */
    /* ------------------------------------------------------------------ */

    /**
     * Convierte coordenadas lógicas (col, row) a píxeles en pantalla.
     * @private
     */
    _gridToScreen(col, row) {
        return {
            x: (col - row) * this.STEP_X,
            y: (col + row) * this.STEP_Y,
        };
    }

    /* ------------------------------------------------------------------ */
    /*  Eventos del grid                                                     */
    /* ------------------------------------------------------------------ */

    _registrarEventosGrid() {
        // Los eventos hover y click se manejan directamente en cada cubo
        // via _onEnter/_onClick/_onLeave registrados en _crearCubo().
        // Aquí solo registramos mousedown a nivel de grid para detectar drag.
        let _mouseDownX = 0;
        let _mouseDownY = 0;
        this._gridEl.addEventListener('mousedown', (e) => {
            _mouseDownX = e.clientX;
            _mouseDownY = e.clientY;
        });
        this._getMouseDown = () => ({ x: _mouseDownX, y: _mouseDownY });

        this._gridEl.addEventListener('mouseleave', () => {
            if (this._cuboHover) {
                this._cuboHover.classList.remove('hovered');
                this._cuboHover = null;
            }
            this._gridEl.dispatchEvent(new CustomEvent('celda-leave', { bubbles: true }));
        });
    }

    _seleccionado = null;
    _cuboHover    = null;

    _onEnter(e) {
        // Ignorar eventos simulados por touch (el navegador genera mouseenter
        // después de un tap en tablets, lo que causaría el hovered azul en lugar del selected dorado)
        if (e.sourceCapabilities?.firesTouchEvents) return;

        // No procesar si hay botón presionado (drag)
        if (e.buttons !== 0) return;

        const cubo     = e.currentTarget;
        const col      = parseInt(cubo.dataset.col, 10);
        const row      = parseInt(cubo.dataset.row, 10);
        const etiqueta = cubo.dataset.etiqueta ?? 'g';

        if (this._cuboHover && this._cuboHover !== cubo) {
            this._cuboHover.classList.remove('hovered');
        }
        cubo.classList.add('hovered');
        this._cuboHover = cubo;

        this._gridEl.dispatchEvent(new CustomEvent('celda-enter', {
            bubbles: true,
            detail: { col, row, etiqueta, originalEvent: e }
        }));
    }

    _onLeave() {
        if (this._cuboHover) {
            this._cuboHover.classList.remove('hovered');
            this._cuboHover = null;
        }
        this._gridEl.dispatchEvent(new CustomEvent('celda-leave', { bubbles: true }));
    }

    _onClick(e) {
        // Ignorar si fue un drag
        const md = this._getMouseDown ? this._getMouseDown() : { x: e.clientX, y: e.clientY };
        if (Math.abs(e.clientX - md.x) > 6 || Math.abs(e.clientY - md.y) > 6) return;

        const cubo     = e.currentTarget;
        const col      = parseInt(cubo.dataset.col, 10);
        const row      = parseInt(cubo.dataset.row, 10);
        const etiqueta = cubo.dataset.etiqueta ?? 'g';

        if (this._seleccionado && this._seleccionado !== cubo) {
            this._seleccionado.classList.remove('selected');
        }
        if (this._seleccionado === cubo) {
            cubo.classList.remove('selected');
            this._seleccionado = null;
        } else {
            cubo.classList.add('selected');
            this._seleccionado = cubo;
        }

        if (typeof this.onCeldaClick === 'function') {
            this.onCeldaClick(col, row, etiqueta);
        }

        this._gridEl.dispatchEvent(new CustomEvent('celda-click', {
            bubbles: true,
            detail: { col, row, etiqueta }
        }));
    }

    /* ------------------------------------------------------------------ */
    /*  Sistema de burbujas de recursos                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Muestra una burbuja de recurso que asciende desde un edificio.
     * Anima la burbuja con un movimiento ascendente y fade out.
     * 
     * @param {number} col - Columna del edificio
     * @param {number} row - Fila del edificio
     * @param {string} tipo - Tipo de recurso ('dinero', 'comida', 'electricidad', 'agua')
     * @param {number} cantidad - Cantidad del recurso
     */
    mostrarBurbuja(col, row, tipo, cantidad) {
        
        if (!this._burbujesEl) {
            console.error('[GridRenderer] ERROR: _burbujesEl no existe. El contenedor no fue inicializado.');
            return;
        }

        // Mapeo de tipos de recurso a emojis
        const iconos = {
            'dinero': '💵',
            'comida': '🍎',
            'electricidad': '⚡',
            'agua': '💧',
            'produccion': '📦'
        };

        const icono = iconos[tipo] || '📦';

        // Obtener posición en pantalla usando el cubo DOM real.
        // Como el contenedor de burbujas es position:fixed en el body,
        // necesitamos coordenadas de pantalla (getBoundingClientRect).
        const claveRef = `${col},${row}`;
        const cuboEl = this._cubos.get(claveRef);
        let posX, posY;
        if (cuboEl) {
            const rect = cuboEl.getBoundingClientRect();
            posX = rect.left + rect.width / 2;
            posY = rect.top + rect.height / 2;
        } else {
            // Fallback: calcular con coordenadas isométricas + transform del canvas
            const canvasWrap = document.getElementById('canvas-wrap');
            const canvasRect = canvasWrap ? canvasWrap.getBoundingClientRect() : { left: 0, top: 0 };
            const { x, y } = this._gridToScreen(col, row);
            const scale = this._leerEscalaCanvas(canvasWrap);
            posX = canvasRect.left + (x + this._offsetX + this.TW / 2) * scale;
            posY = canvasRect.top + (y + this.TH / 2) * scale;
        }

        // Crear elemento de burbuja
        const burbuja = document.createElement('div');
        burbuja.className = 'burbuja-recurso';
        burbuja.dataset.tipo = tipo;
        const bubbleClass = `burbuja-pos-${++this._burbujaSeq}`;
        burbuja.classList.add(bubbleClass);
        this._runtimeCss.setRule(
            `burbuja-pos-${this._burbujaSeq}`,
            `.${bubbleClass} { left: ${posX}px; top: ${posY}px; transform: translate(-50%, -50%); }`
        );

        // Agregar cantidad si es > 1
        if (cantidad > 1) {
            const cantidad_span = document.createElement('span');
            cantidad_span.className = 'burbuja-cantidad';
            cantidad_span.textContent = cantidad;
            burbuja.appendChild(cantidad_span);
        }

        burbuja.appendChild(document.createTextNode(icono));

        this._burbujesEl.appendChild(burbuja);

        // Forzar reflow para que la animación inicial sea visible
        void burbuja.offsetHeight;

        // Aplicar animación con doble rAF para garantizar que el estado
        // inicial (opacity:1) ya esté pintado antes de iniciar la transición
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                burbuja.classList.add('burbuja-recurso--animando');
            });
        });

        // Limpiar después de la animación
        setTimeout(() => {
            burbuja.remove();
        }, 1800);
    }
}