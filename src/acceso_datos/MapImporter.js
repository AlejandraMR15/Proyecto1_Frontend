/**
 * CIUDAD VIRTUAL — MapImporter.js
 *
 * Responsabilidad única: importación y validación de mapas desde JSON.
 *  - Leer archivo JSON del mapa
 *  - Validar dimensiones (15x15 mínimo, 30x30 máximo)
 *  - Validar etiquetas de terreno y construcciones
 *  - Retornar matriz lista para crear instancia de Mapa
 */

export default class MapImporter {
    /**
     * Etiquetas válidas que pueden estar en el mapa.
     * @type {Set<string>}
     */
    static ETIQUETAS_VALIDAS = new Set([
        'g',                              // terreno vacío
        'r',                              // vía
        'P1',                             // parque
        'R1', 'R2',                       // residenciales
        'C1', 'C2',                       // comerciales
        'I1', 'I2',                       // industriales
        'S1', 'S2', 'S3',                 // servicios
        'U1', 'U2'                        // plantas de utilidad
    ]);

    /**
     * Rangos permitidos para dimensiones del mapa.
     * @type {Object}
     */
    static LIMITES_DIMENSIONES = {
        minimo: 15,
        maximo: 30
    };

    /**
     * Procesa un archivo JSON y retorna un objeto con la matriz y metadatos validados.
     *
     * @param {File} archivo Archivo JSON seleccionado.
     * @returns {Promise<{
     *     ancho: number,
     *     alto: number,
     *     matriz: Array<Array<string>>,
     *     metadatos: {nombre?: string, alcalde?: string}
     * }>} Promesa con los datos del mapa validados.
     * @throws {Error} Si el archivo es inválido o no cumple validaciones.
     */
    static procesarArchivoJSON(archivo) {
        return new Promise((resolve, reject) => {
            if (!archivo) {
                reject(new Error('No se seleccionó un archivo.'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (evento) => {
                try {
                    const contenidoJSON = evento.target.result;
                    const datos = JSON.parse(contenidoJSON);

                    // Extraer datos del JSON
                    const resultado = this._extraerYValidarDatos(datos);
                    resolve(resultado);

                } catch (error) {
                    if (error instanceof SyntaxError) {
                        reject(new Error('El archivo no es un JSON válido.'));
                    } else {
                        reject(error);
                    }
                }
            };

            reader.onerror = () => {
                reject(new Error('No se pudo leer el archivo.'));
            };

            reader.readAsText(archivo);
        });
    }

    /**
     * Extrae y valida los datos del JSON parseado.
     *
     * Soporta dos formatos:
     * 1. Formato de partida completa: `{ map: {...}, cityName: "...", mayor: "...", gridSize: {...} }`
     * 2. Formato de mapa simple: `{ grid: [...], width: number, height: number }`
     *
     * @private
     * @param {Object} datos Objeto JSON parseado.
     * @returns {Object} Datos validados con matriz, ancho, alto y metadatos.
     * @throws {Error} Si faltan datos requeridos o no son válidos.
     */
    static _extraerYValidarDatos(datos) {
        let ancho, alto, matriz, metadatos = {};

        // Detectar formato: partida completa vs mapa simple
        if (datos.map && datos.gridSize) {
            // Formato de partida completa (exportada por PartidaManager)
            const mapData = datos.map;
            ancho = datos.gridSize.width;
            alto = datos.gridSize.height;
            matriz = mapData.matriz || mapData.data || [];
            metadatos = {
                nombre: datos.cityName,
                alcalde: datos.mayor
            };
        } else if (datos.grid && typeof datos.width === 'number' && typeof datos.height === 'number') {
            // Formato de mapa simple
            ancho = datos.width;
            alto = datos.height;
            matriz = datos.grid;
        } else {
            throw new Error('El JSON no contiene estructura de mapa válida.');
        }

        // Validar que existan dimensiones
        if (!Number.isInteger(ancho) || !Number.isInteger(alto)) {
            throw new Error('Las dimensiones del mapa deben ser números enteros.');
        }

        // Validar rango de dimensiones
        this._validarDimensiones(ancho, alto);

        // Validar que la matriz sea un array
        if (!Array.isArray(matriz)) {
            throw new Error('La matriz del mapa debe ser un array.');
        }

        // Validar dimensiones de la matriz coincidan
        this._validarConsistenciaMatriz(matriz, ancho, alto);

        // Validar etiquetas
        this._validarEtiquetas(matriz);

        return {
            ancho,
            alto,
            matriz,
            metadatos
        };
    }

    /**
     * Valida que las dimensiones estén dentro del rango permitido.
     *
     * @private
     * @param {number} ancho Ancho del mapa.
     * @param {number} alto Alto del mapa.
     * @throws {Error} Si ancho o alto están fuera del rango [15, 30].
     */
    static _validarDimensiones(ancho, alto) {
        const { minimo, maximo } = this.LIMITES_DIMENSIONES;

        if (ancho < minimo || ancho > maximo) {
            throw new Error(
                `Ancho inválido: ${ancho}. Debe estar entre ${minimo} y ${maximo}.`
            );
        }

        if (alto < minimo || alto > maximo) {
            throw new Error(
                `Alto inválido: ${alto}. Debe estar entre ${minimo} y ${maximo}.`
            );
        }
    }

    /**
     * Valida que la matriz tenga las dimensiones correctas (alto x ancho).
     *
     * @private
     * @param {Array<Array>} matriz Matriz del mapa.
     * @param {number} ancho Ancho esperado (número de columnas).
     * @param {number} alto Alto esperado (número de filas).
     * @throws {Error} Si la matriz no tiene las dimensiones correctas.
     */
    static _validarConsistenciaMatriz(matriz, ancho, alto) {
        if (matriz.length !== alto) {
            throw new Error(
                `La matriz tiene ${matriz.length} filas pero se esperaban ${alto}.`
            );
        }

        for (let i = 0; i < matriz.length; i++) {
            if (!Array.isArray(matriz[i])) {
                throw new Error(`La fila ${i} no es un array.`);
            }
            if (matriz[i].length !== ancho) {
                throw new Error(
                    `La fila ${i} tiene ${matriz[i].length} columnas pero se esperaban ${ancho}.`
                );
            }
        }
    }

    /**
     * Valida que todas las etiquetas en la matriz sean válidas.
     *
     * @private
     * @param {Array<Array<string>>} matriz Matriz del mapa.
     * @throws {Error} Si hay etiquetas inválidas.
     */
    static _validarEtiquetas(matriz) {
        const etiquetasInvalidas = new Set();

        for (let y = 0; y < matriz.length; y++) {
            for (let x = 0; x < matriz[y].length; x++) {
                const etiqueta = matriz[y][x];
                if (!this.ETIQUETAS_VALIDAS.has(etiqueta)) {
                    etiquetasInvalidas.add(etiqueta);
                }
            }
        }

        if (etiquetasInvalidas.size > 0) {
            const invalidas = Array.from(etiquetasInvalidas).join(', ');
            throw new Error(
                `Etiquetas inválidas encontradas: ${invalidas}. ` +
                `Válidas: ${Array.from(this.ETIQUETAS_VALIDAS).join(', ')}`
            );
        }
    }

    /**
     * Retorna la lista de etiquetas válidas.
     *
     * @returns {Array<string>} Array con todas las etiquetas permitidas.
     */
    static obtenerEtiquetasValidas() {
        return Array.from(this.ETIQUETAS_VALIDAS);
    }

    /**
     * Retorna información sobre los límites de dimensiones.
     *
     * @returns {Object} Objeto con `minimo` y `maximo`.
     */
    static obtenerLimitesDimensiones() {
        return { ...this.LIMITES_DIMENSIONES };
    }
}
