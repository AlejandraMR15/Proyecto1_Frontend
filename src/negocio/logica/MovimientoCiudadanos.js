/**
 * CIUDAD VIRTUAL — MovimientoCiudadanos.js
 *
 * Renderizado y animación visual de ciudadanos sobre el mapa isométrico.
 *
 * Responsabilidades:
 *  - Crear/eliminar sprites DOM (.citizen-sprite) dentro de #iso-grid.
 *  - Calcular la posición isométrica de cada celda de tipo vía ('r').
 *  - Mover sprites paso a paso entre celdas 'r' adyacentes con CSS transition.
 *  - Sincronizarse con el GestorCiudadano para reflejar la población actual.
 *
 * Uso desde grid.js:
 *  import MovimientoCiudadanos from './MovimientoCiudadanos.js';
 *  const movimiento = new MovimientoCiudadanos(mapa, renderer, juego.gestorCiudadanos);
 *  movimiento.iniciar();                  // arranca el loop de animación
 *  movimiento.detener();                  // para el loop (p. ej. al pausar el juego)
 */

export default class MovimientoCiudadanos {

    /* ------------------------------------------------------------------ */
    /*  Constructor                                                          */
    /* ------------------------------------------------------------------ */

    /**
     * @param {import('../modelos/Mapa.js').default}             mapa
     *   Instancia del modelo lógico — fuente de verdad de la matriz.
     * @param {import('./GridRenderer.js').default}              renderer
     *   Renderer activo — se usa para leer TW, TH, TD y el offset del grid.
     * @param {import('./GestorCiudadanos.js').default}          gestorCiudadanos
     *   Gestor con la lista viva de ciudadanos.
     * @param {object}  [opciones]
     * @param {string}  [opciones.contenedorId='iso-grid']  id del div que contiene el grid.
     * @param {number}  [opciones.intervaloMs=2500]         ms entre cada paso de movimiento.
     */
    constructor(mapa, renderer, gestorCiudadanos, opciones = {}) {
        this.mapa             = mapa;
        this.renderer         = renderer;
        this.gestorCiudadanos = gestorCiudadanos;

        const {
            contenedorId = 'iso-grid',
            intervaloMs  = 2500,
        } = opciones;

        this.contenedorId = contenedorId;
        this.intervaloMs  = intervaloMs;

        // Elemento DOM contenedor (se resuelve en iniciar())
        this._gridEl = null;

        // Mapa interno: ciudadanoId → { sprite: HTMLElement, col: number, row: number }
        this._sprites = new Map();

        // id del setInterval activo (null = detenido)
        this._intervaloId = null;
    }

    /* ------------------------------------------------------------------ */
    /*  Ciclo de vida                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Arranca el sistema de movimiento.
     * Resuelve el contenedor DOM, sincroniza sprites con la población actual
     * y arranca el intervalo de movimiento.
     */
    iniciar() {
        this._gridEl = document.getElementById(this.contenedorId);
        if (!this._gridEl) {
            console.warn(`[MovimientoCiudadanos] No se encontró #${this.contenedorId}`);
            return;
        }

        // Sincronización inicial de sprites con ciudadanos existentes
        this._sincronizarSprites();

        // Iniciar el loop de movimiento
        this._intervaloId = setInterval(() => this._tick(), this.intervaloMs);
    }

    /**
     * Detiene el loop de movimiento y elimina todos los sprites del DOM.
     */
    detener() {
        if (this._intervaloId !== null) {
            clearInterval(this._intervaloId);
            this._intervaloId = null;
        }
        this._limpiarSprites();
    }

    /* ------------------------------------------------------------------ */
    /*  API pública                                                          */
    /* ------------------------------------------------------------------ */

    /**
     * Renderiza el sprite de un ciudadano en una celda de vía aleatoria.
     * Si el ciudadano ya tiene sprite, no hace nada.
     * @param {import('../modelos/Ciudadano.js').default} ciudadano
     */
    renderCitizen(ciudadano) {
        if (this._sprites.has(ciudadano.id)) return;

        // Obtener todas las vías disponibles
        const vias = this._obtenerTodasLasVias();
        if (vias.length === 0) return; // no hay vías: no se puede colocar

        // Elegir posición inicial aleatoria entre las vías
        const { col, row } = vias[Math.floor(Math.random() * vias.length)];

        // Crear elemento DOM del sprite
        const sprite = document.createElement('div');
        sprite.className  = 'citizen-sprite';
        sprite.title      = `Ciudadano #${ciudadano.id}`;
        sprite.dataset.id = ciudadano.id;

        // Aplicar color según felicidad inicial
        this._actualizarClaseFelicidad(sprite, ciudadano.felicidad);
        // Posicionar en la celda inicial
        this._posicionarSprite(sprite, col, row);
        this._gridEl.appendChild(sprite);

        // Registrar en el mapa interno
        this._sprites.set(ciudadano.id, { sprite, col, row });
    }

    /**
     * Selecciona una celda de tipo 'r' adyacente a la posición actual del
     * ciudadano y actualiza top/left del elemento DOM para desplazarlo.
     * La transición CSS se encarga del movimiento suavizado.
     * @param {number|string} ciudadanoId  id del ciudadano a mover.
     */
    moveCitizenVisual(ciudadanoId) {
        const entrada = this._sprites.get(ciudadanoId);
        if (!entrada) return;

        const { col, row } = entrada;

        // Obtener celdas de vía adyacentes ortogonales
        const adyacentes = this._viasAdyacentes(col, row);
        if (adyacentes.length === 0) return; // sin salida: no se mueve

        // Elegir destino aleatorio entre las adyacentes
        const destino = adyacentes[Math.floor(Math.random() * adyacentes.length)];

        // Actualizar posición en el registro interno
        entrada.col = destino.col;
        entrada.row = destino.row;

        // Mover el sprite en el DOM — la transition CSS suaviza el cambio
        this._posicionarSprite(entrada.sprite, destino.col, destino.row);
    }

    /* ------------------------------------------------------------------ */
    /*  Loop interno                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Ejecuta un paso del loop:
     *  1. Sincroniza sprites con la población actual (altas/bajas).
     *  2. Mueve cada sprite un paso.
     * @private
     */
    _tick() {
        if (document.hidden) return;
        this._sincronizarSprites();

        const ciudadanos = this.gestorCiudadanos?.ciudadanos ?? [];
        const porId = new Map(ciudadanos.map(c => [c.id, c]));

        this._sprites.forEach((entrada, id) => {
            const ciudadano = porId.get(id);
            if (ciudadano) {
                this._actualizarClaseFelicidad(entrada.sprite, ciudadano.felicidad);
            }
            this.moveCitizenVisual(id);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Sincronización de sprites con la población                           */
    /* ------------------------------------------------------------------ */

    /**
     * Compara la lista viva de ciudadanos con los sprites activos:
     *  - Crea sprites para ciudadanos nuevos.
     *  - Elimina sprites de ciudadanos que ya no existen.
     * @private
     */
    _sincronizarSprites() {
        const ciudadanos = this.gestorCiudadanos?.ciudadanos ?? [];

        // Altas: ciudadanos sin sprite aún
        ciudadanos.forEach(c => this.renderCitizen(c));

        // Bajas: sprites huérfanos (ciudadano eliminado)
        const idsActivos = new Set(ciudadanos.map(c => c.id));
        this._sprites.forEach((entrada, id) => {
            if (!idsActivos.has(id)) {
                entrada.sprite.remove();
                this._sprites.delete(id);
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Utilidades de posicionamiento isométrico                             */
    /* ------------------------------------------------------------------ */

    /**
     * Aplica top/left isométricos al sprite según la celda (col, row).
     * Usa la misma fórmula que GridRenderer._gridToScreen() más un offset
     * para centrar el sprite sobre la cara superior del cubo.
     * @private
     * @param {HTMLElement} sprite
     * @param {number}      col
     * @param {number}      row
     */
    _posicionarSprite(sprite, col, row) {
        const TW     = this.renderer.TW;      // ancho del tile (64 px por defecto)
        const TH     = this.renderer.TH;      // altura cara superior = TW/2
        const STEP_X = this.renderer.STEP_X;  // TW/2
        const STEP_Y = this.renderer.STEP_Y;  // TW/4

        // Mismo cálculo que GridRenderer._gridToScreen
        const screenX = (col - row) * STEP_X;
        const screenY = (col + row) * STEP_Y;

        // Offset horizontal para que x nunca sea negativo (igual que en _construirGrid)
        const cols   = this.mapa.ancho;
        const rows   = this.mapa.alto;
        const minX   = (0 - (rows - 1)) * STEP_X;
        const offsetX = -minX;

        // Centrar el sprite sobre poly-bottom de la vía.
        // poly-bottom está TD píxeles más abajo que la cara superior del cubo.
        const TD = this.renderer.TD;
        const spriteSize = 10;
        const left = screenX + offsetX + (TW / 2) - (spriteSize / 2);
        const top  = screenY + TD      + (TH / 2) - (spriteSize / 2);

        sprite.style.left = left + 'px';
        sprite.style.top  = top  + 'px';

        // Mismo z-index que el cubo de esa celda para respetar el Painter's Algorithm
        // Los edificios con mayor col+row quedarán encima de los ciudadanos
        sprite.style.zIndex = (col + row).toString();
    }

    /* ------------------------------------------------------------------ */
    /*  Consultas sobre la matriz                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Devuelve todas las celdas de tipo 'r' de la matriz.
     * @private
     * @returns {Array<{col: number, row: number}>}
     */
    _obtenerTodasLasVias() {
        const vias = [];
        const matriz = this.mapa.matriz;
        for (let row = 0; row < this.mapa.alto; row++) {
            for (let col = 0; col < this.mapa.ancho; col++) {
                if (matriz[row][col] === 'r') {
                    vias.push({ col, row });
                }
            }
        }
        return vias;
    }

    /**
     * Devuelve las celdas de tipo 'r' adyacentes ortogonales a (col, row).
     * @private
     * @param {number} col
     * @param {number} row
     * @returns {Array<{col: number, row: number}>}
     */
    _viasAdyacentes(col, row) {
        // Las cuatro direcciones ortogonales
        const candidatos = [
            { col,     row: row - 1 }, // arriba
            { col,     row: row + 1 }, // abajo
            { col: col - 1, row     }, // izquierda
            { col: col + 1, row     } // derecha
        ];

        return candidatos.filter(({ col: c, row: r }) => {
            if (c < 0 || r < 0 || c >= this.mapa.ancho || r >= this.mapa.alto) return false;
            return this.mapa.matriz[r][c] === 'r';
        });
    }

    _actualizarClaseFelicidad(sprite, felicidad = 100) {
        const CLASES_FELICIDAD = [
            'felicidad-critica',
            'felicidad-baja',
            'felicidad-media',
            'felicidad-buena',
            'felicidad-alta',
        ];

        CLASES_FELICIDAD.forEach(cls => sprite.classList.remove(cls));

        let clase;
        if      (felicidad < 20) clase = 'felicidad-critica';
        else if (felicidad < 40) clase = 'felicidad-baja';
        else if (felicidad < 60) clase = 'felicidad-media';
        else if (felicidad < 80) clase = 'felicidad-buena';
        else                     clase = 'felicidad-alta';

        sprite.classList.add(clase);
    }

    /* ------------------------------------------------------------------ */
    /*  Limpieza                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Elimina todos los sprites del DOM y limpia el registro interno.
     * @private
     */
    _limpiarSprites() {
        this._sprites.forEach(({ sprite }) => sprite.remove());
        this._sprites.clear();
    }
}