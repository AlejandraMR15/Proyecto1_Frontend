/**
 * Modelo de mapa de la ciudad.
 *
 * La matriz contiene etiquetas de terreno y construcciones:
 * - 'g': terreno vacio (grass)
 * - 'r': via (road)
 * - 'P1': parque
 * - 'R1', 'R2': residenciales
 * - 'C1', 'C2': comerciales
 * - 'I1', 'I2': industriales
 * - 'S1', 'S2', 'S3': servicios
 * - 'U1', 'U2': plantas de utilidad
 */
export default class Mapa {
    /**
     * Crea una instancia del mapa.
     * @param {number} [ancho=15] Cantidad de columnas de la matriz.
     * @param {number} [alto=15] Cantidad de filas de la matriz.
     * @param {Array<Array<string>>} [matriz=[]] Matriz inicial (opcional).
     */
    constructor(ancho = 15, alto = 15, matriz = []) {
        this.ancho = ancho;
        this.alto = alto;
        this.matriz = matriz;
    }

    /**
     * Agrega un elemento en la coordenada (x, y) si cumple las reglas.
     *
     * Reglas de colocacion:
     * - La celda debe estar vacia.
     * - La via ('r') puede colocarse en cualquier celda vacia.
     * - Cualquier otra construccion requiere al menos una via adyacente.
     *
     * @param {number} x Coordenada horizontal (columna).
     * @param {number} y Coordenada vertical (fila).
     * @param {string} elemento Etiqueta a colocar.
     * @returns {boolean} `true` si se coloco correctamente, `false` en caso contrario.
     */
    agregarElemento(x, y, elemento) {
        if (!this._inBounds(x, y) || !elemento) return false;
        if (!this.celdaVacia(x, y)) return false; // debe estar vacía

        // si es vía, se puede colocar directamente
        if (this._esVia(elemento)) {
            this.matriz[y][x] = elemento;
            return true;
        }

        // para cualquier otro tipo de construcción requiere vía adyacente
        if (!this.tieneViaAdyacente(x, y)) return false;

        // colocar la etiqueta del edificio
        this.matriz[y][x] = elemento;
        return true;
    }

    /**
     * Elimina el contenido de una celda y la deja como terreno vacio ('g').
     * @param {number} x Coordenada horizontal (columna).
     * @param {number} y Coordenada vertical (fila).
     * @returns {string|boolean} Devuelve la etiqueta previa si la celda es valida,
     * o `false` si la coordenada esta fuera de limites.
     */
    eliminarElemento(x, y) {
        if (!this._inBounds(x, y)) return false;
        const previo = this.matriz[y][x];
        // establecer como terreno vacío
        this.matriz[y][x] = 'g';
        return previo;
    }

    /**
     * Determina si una celda esta vacia.
     *
     * Se considera vacia cuando la etiqueta es:
     * - 'g'
     * - `undefined`
     * - `null`
     * - cadena vacia
     *
     * @param {number} x Coordenada horizontal (columna).
     * @param {number} y Coordenada vertical (fila).
     * @returns {boolean} `true` si la celda esta vacia; `false` en otro caso.
     */
    celdaVacia(x, y) {
        if (!this._inBounds(x, y)) return false;
        const valor = this.matriz[y][x];
        return valor === undefined || valor === null || valor === '' || valor === 'g';
    }

    /**
     * Verifica si existe al menos una via ('r') en las cuatro celdas adyacentes
     * ortogonales (arriba, abajo, izquierda, derecha).
     * @param {number} x Coordenada horizontal (columna).
     * @param {number} y Coordenada vertical (fila).
     * @returns {boolean} `true` si hay via adyacente; `false` en caso contrario.
     */
    tieneViaAdyacente(x, y) {
        if (!this._inBounds(x, y)) return false;
        const adyacentes = [
            [x, y - 1], // arriba
            [x, y + 1], // abajo
            [x - 1, y], // izquierda
            [x + 1, y]  // derecha
        ];
        return adyacentes.some(([ax, ay]) => this._inBounds(ax, ay) && this._esVia(this.matriz[ay][ax]));
    }

    /**
     * Genera o carga la matriz interna del mapa.
     *
     * Comportamiento:
     * - Si `datosCargados` es una matriz valida con las dimensiones del mapa,
     *   se usa directamente como `this.matriz`.
     * - En caso contrario, se crea una matriz nueva de `alto x ancho`
     *   inicializada con 'g'.
     *
     * @param {Array<Array<string>>|null} [datosCargados=null] Matriz externa opcional.
     * @returns {Array<Array<string>>} Matriz interna resultante.
     */
    generarMatriz(datosCargados = null) {
        // 1. Si hay datos (ya como Array de JS), se usan
        if (Array.isArray(datosCargados) && this._esMatrizValida(datosCargados)) {
            this.matriz = datosCargados;
            return this.matriz;
        }

        // 2. Si no hay datos cargados, se genera la matriz por defecto ('g' de grass)
        this.matriz = [];
        for (let row = 0; row < this.alto; row++) {
            const fila = Array(this.ancho).fill('g'); // Forma rápida de llenar una fila
            this.matriz.push(fila);
        }
        
        return this.matriz;
    }
    
    /**
     * Cuenta la cantidad de edificios por etiqueta en toda la matriz.
     *
     * Solo contabiliza tipos de edificio (no cuenta 'g', 'r' ni 'P1').
     * Siempre retorna todas las claves soportadas aunque su valor sea 0.
     *
     * @returns {{
     *   R1: number,
     *   R2: number,
     *   C1: number,
     *   C2: number,
     *   I1: number,
     *   I2: number,
     *   S1: number,
     *   S2: number,
     *   S3: number,
     *   U1: number,
     *   U2: number
     * }} Diccionario con conteo por tipo de edificio.
     */
    contarEdificios() {
        const tiposEdificio = ['R1', 'R2', 'C1', 'C2', 'I1', 'I2', 'S1', 'S2', 'S3', 'U1', 'U2'];
        const conteo = {};

        // Inicializa todas las etiquetas en 0 para siempre devolver el diccionario completo.
        tiposEdificio.forEach(tipo => {
            conteo[tipo] = 0;
        });

        for (let y = 0; y < this.alto; y++) {
            for (let x = 0; x < this.ancho; x++) {
                const etiqueta = this.matriz[y][x];
                if (Object.prototype.hasOwnProperty.call(conteo, etiqueta)) {
                    conteo[etiqueta] += 1;
                }
            }
        }

        return conteo;
    }

    /**
     * Convierte la matriz de etiquetas a matriz binaria para calculo de rutas.
     *
     * Reglas de conversion:
     * - 0: celda con via ('r')
     * - 1: cualquier otra etiqueta ('g', 'P1', edificios, etc.)
     *
     * @returns {Array<Array<number>>} Matriz con 0s y 1s.
     */
    generarMatriz01() {
        if (!Array.isArray(this.matriz) || this.matriz.length === 0) return [];

        // 0 para vías ('r'), 1 para cualquier otra etiqueta.
        return this.matriz.map(fila =>
            fila.map(celda => (this._esVia(celda) ? 1 : 0))
        );
    }

    /**
     * Indica si una coordenada esta dentro de los limites del mapa.
     * @private
     * @param {number} x Coordenada horizontal.
     * @param {number} y Coordenada vertical.
     * @returns {boolean} `true` si esta dentro de rango; `false` en otro caso.
     */
    _inBounds(x, y) {
        return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.ancho && y < this.alto;
    }

    /**
     * Determina si una etiqueta representa una via.
     * @private
     * @param {string} valor Etiqueta de celda.
     * @returns {boolean} `true` si la etiqueta es 'r'.
     */
    _esVia(valor) {
        return valor === 'r';
    }

    /**
     * Valida estructura y dimensiones de una matriz externa.
     * @private
     * @param {Array<Array<string>>} matriz Matriz a validar.
     * @returns {boolean} `true` si coincide con `alto` y `ancho`; `false` si no.
     */
    _esMatrizValida(matriz) {
        if (!Array.isArray(matriz)) return false;
        if (matriz.length !== this.alto) return false;
        return matriz.every(fila => Array.isArray(fila) && fila.length === this.ancho);
    }

    /**
     * Serializa el mapa a un objeto JSON.
     * @returns {object} Objeto serializable con ancho, alto y matriz.
     */
    toJSON() {
        return {
            ancho: this.ancho,
            alto: this.alto,
            matriz: this.matriz
        };
    }
}