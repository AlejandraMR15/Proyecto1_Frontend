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

import Mapa from '../modelos/Mapa.js';

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

        // Aseguramos que Mapa tenga una matriz generada
        if (!Array.isArray(this.mapa.matriz) || this.mapa.matriz.length === 0) {
            this.mapa.generarMatriz();
        }

        this._construirGrid();
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
        const offsetX = -minX;

        // Dimensiones totales del contenedor
        const maxX = this._gridToScreen(cols - 1, 0).x + this.TW;
        const maxY = this._gridToScreen(cols - 1, rows - 1).y + this.TH + this.TD;
        this._gridEl.style.width  = (maxX + offsetX) + 'px';
        this._gridEl.style.height = maxY + 'px';

        // Painter's Algorithm: renderizar de menor a mayor (col + row)
        const celdas = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                celdas.push({ row, col });
            }
        }
        celdas.sort((a, b) => (a.row + a.col) - (b.row + b.col));

        celdas.forEach(({ row, col }, idx) => {
            const cubo = this._crearCubo(col, row, offsetX, idx);
            this._gridEl.appendChild(cubo);
            this._cubos.set(`${col},${row}`, cubo);
        });
    }

    /**
     * Crea el elemento div de un cubo isométrico para la celda (col, row).
     * Lee la etiqueta actual de Mapa para asignar los colores correctos.
     * @private
     */
    _crearCubo(col, row, offsetX, idx) {
        const { x, y } = this._gridToScreen(col, row);
        const etiqueta = this.mapa.matriz[row][col] ?? 'g';

        const cubo = document.createElement('div');
        cubo.className = 'iso-cube';
        cubo.dataset.col = col;
        cubo.dataset.row = row;
        cubo.dataset.etiqueta = etiqueta;
        cubo.style.left   = (x + offsetX) + 'px';
        cubo.style.top    = y + 'px';
        cubo.style.width  = this.TW + 'px';
        cubo.style.height = (this.TH + this.TD) + 'px';
        cubo.style.zIndex = row + col;

        // Animación de entrada escalonada
        cubo.style.opacity    = '0';
        cubo.style.transition = 'opacity 0.25s ease';

        const colores = this._coloresPorEtiqueta(etiqueta);
        const svg = this._crearSVGCubo(colores.top, colores.left, colores.right);
        cubo.appendChild(svg);

        // Eventos
        cubo.addEventListener('mouseenter', (e) => this._onEnter(e));
        cubo.addEventListener('mouseleave', ()  => this._onLeave());
        cubo.addEventListener('click',      (e) => this._onClick(e));

        // Fade-in escalonado
        setTimeout(() => { cubo.style.opacity = '1'; }, idx * 3 + 50);

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

        const colores = this._coloresPorEtiqueta(etiqueta);

        // Actualizar fills de los tres polígonos (top, left, right)
        const polyTop   = cubo.querySelector('.poly-top');
        const polyLeft  = cubo.querySelector('.poly-left');
        const polyRight = cubo.querySelector('.poly-right');

        if (polyTop)   polyTop.setAttribute('fill',   colores.top);
        if (polyLeft)  polyLeft.setAttribute('fill',  colores.left);
        if (polyRight) polyRight.setAttribute('fill', colores.right);

        // Efecto visual breve para indicar el cambio
        this._animarCambio(cubo);
    }

    /**
     * Aplica un flash visual rápido al cubo para indicar que fue modificado.
     * @private
     */
    _animarCambio(cubo) {
        cubo.style.filter = 'brightness(2) drop-shadow(0 0 6px rgba(255,255,200,0.9))';
        setTimeout(() => { cubo.style.filter = ''; }, 250);
    }

    /* ------------------------------------------------------------------ */
    /*  Paleta de colores por etiqueta                                       */
    /* ------------------------------------------------------------------ */

    /**
     * Devuelve las tres caras de color (top, left, right) para una etiqueta dada.
     * Centraliza aquí toda la lógica visual de tipos de celda.
     *
     * Grupos de colores:
     *  'g'        → terreno (azul claro — color base de la demo)
     *  'r'        → vía (gris oscuro)
     *  'P1'       → parque (verde)
     *  'R1','R2'  → residencial (naranja cálido)
     *  'C1','C2'  → comercial (amarillo dorado)
     *  'I1','I2'  → industrial (marrón / óxido)
     *  'S1'–'S3'  → servicio (púrpura)
     *  'U1','U2'  → planta de utilidad (rojo)
     *
     * @private
     * @param {string} etiqueta
     * @returns {{ top: string, left: string, right: string }}
     */
    _coloresPorEtiqueta(etiqueta) {
        const paletas = {
            // Terreno vacío (azul-celeste, igual que la demo original)
            'g':  { top: '#7ecfe6', left: '#4baec8', right: '#2d8aaa' },

            // Vías (gris carbón)
            'r':  { top: '#8a9099', left: '#5c6169', right: '#3d4147' },

            // Parque (verde)
            'P1': { top: '#6ecf5a', left: '#46a834', right: '#2d7a20' },

            // Residencial (naranja cálido)
            'R1': { top: '#f0a040', left: '#c07820', right: '#8a5010' },
            'R2': { top: '#f5b860', left: '#d09030', right: '#9a6818' },

            // Comercial (amarillo dorado)
            'C1': { top: '#f0d040', left: '#c4a820', right: '#9a8010' },
            'C2': { top: '#f5e060', left: '#d4b830', right: '#a89018' },

            // Industrial (marrón / óxido)
            'I1': { top: '#b06030', left: '#804018', right: '#582808' },
            'I2': { top: '#c07840', left: '#905028', right: '#683010' },

            // Servicios (púrpura)
            'S1': { top: '#a060d0', left: '#7038a8', right: '#4a1880' },
            'S2': { top: '#b070e0', left: '#8048b8', right: '#5828a0' },
            'S3': { top: '#c080f0', left: '#9058c8', right: '#6838b0' },

            // Plantas de utilidad (rojo)
            'U1': { top: '#e04040', left: '#b01818', right: '#800808' },
            'U2': { top: '#f05050', left: '#c02828', right: '#981010' },
        };

        // Fallback: terreno vacío para etiquetas desconocidas
        return paletas[etiqueta] ?? paletas['g'];
    }

    /* ------------------------------------------------------------------ */
    /*  SVG del cubo                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Construye el SVG con las tres caras del cubo isométrico.
     * Geometría exacta sin huecos (mismos vértices compartidos).
     * @private
     */
    _crearSVGCubo(colorTop, colorLeft, colorRight) {
        const W = this.TW;
        const H = this.TH;
        const D = this.TD;

        // Vértices
        const A  = [W / 2, 0          ];
        const B  = [W,     H / 2      ];
        const C  = [W / 2, H          ];
        const D2 = [0,     H / 2      ];
        const E  = [0,     H / 2 + D  ];
        const F  = [W / 2, H + D      ];
        const G  = [W,     H / 2 + D  ];

        const pts = (arr) => arr.map(p => p.join(',')).join(' ');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width',   W);
        svg.setAttribute('height',  H + D);
        svg.setAttribute('viewBox', `0 0 ${W} ${H + D}`);
        svg.style.overflow = 'visible';
        svg.style.display  = 'block';

        const mkPoly = (points, fill, cls) => {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            p.setAttribute('points', pts(points));
            p.setAttribute('fill', fill);
            p.classList.add(cls);
            return p;
        };

        svg.appendChild(mkPoly([D2, C, F, E], colorLeft,  'poly-left' ));
        svg.appendChild(mkPoly([C, B, G, F],  colorRight, 'poly-right'));
        svg.appendChild(mkPoly([A, B, C, D2], colorTop,   'poly-top'  ));

        return svg;
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

    /**
     * Referencia al cubo actualmente seleccionado.
     * @private
     */
    _seleccionado = null;

    _onEnter(e) {
        // El tooltip es gestionado externamente (grid.js / main); aquí solo
        // emitimos el evento con los datos de la celda para que quien quiera
        // lo consuma.
        const cubo = e.currentTarget;
        const col  = parseInt(cubo.dataset.col,  10);
        const row  = parseInt(cubo.dataset.row,  10);
        const etiqueta = cubo.dataset.etiqueta ?? 'g';

        // Disparar evento personalizado para que código externo (p. ej. tooltip)
        // pueda suscribirse sin acoplar este módulo.
        this._gridEl.dispatchEvent(new CustomEvent('celda-enter', {
            bubbles: true,
            detail: { col, row, etiqueta, originalEvent: e }
        }));
    }

    _onLeave() {
        this._gridEl.dispatchEvent(new CustomEvent('celda-leave', { bubbles: true }));
    }

    /**
     * Gestiona el click sobre un cubo.
     * - Actualiza la selección visual.
     * - Llama al callback `onCeldaClick` si fue provisto.
     * - No escribe nada en Mapa por sí solo; eso corresponde a la capa de UI
     *   que decide qué etiqueta colocar.
     * @private
     */
    _onClick(e) {
        const cubo = e.currentTarget;
        const col  = parseInt(cubo.dataset.col,  10);
        const row  = parseInt(cubo.dataset.row,  10);
        const etiqueta = cubo.dataset.etiqueta ?? 'g';

        // Gestión de selección visual
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

        // Notificar a la capa superior
        if (typeof this.onCeldaClick === 'function') {
            this.onCeldaClick(col, row, etiqueta);
        }

        // También como evento del DOM para suscriptores desacoplados
        this._gridEl.dispatchEvent(new CustomEvent('celda-click', {
            bubbles: true,
            detail: { col, row, etiqueta }
        }));
    }
}
