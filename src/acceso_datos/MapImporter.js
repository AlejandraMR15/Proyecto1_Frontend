/**
 * CIUDAD VIRTUAL — MapImporter.js
 *
 * Responsabilidad única: importación y validación de mapas desde TXT.
 *  - Leer archivo TXT del mapa
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
     * Procesa un archivo TXT y retorna un objeto con la matriz y metadatos validados.
     *
     * Formato esperado del TXT:
     * - Primera línea: "ANCHO ALTO" (ej: "15 15")
     * - Siguientes líneas: filas del mapa con etiquetas separadas por espacios
     *
     * Ejemplo:
     * ```
     * 15 15
     * g r R1 C1 I1 S1 U1 P1 g g g g g g g
     * r R1 R1 R1 C1 C1 I1 I1 S1 S1 U1 P1 g g g
     * ...
     * ```
     *
     * @param {File} archivo Archivo TXT seleccionado.
     * @returns {Promise<{
     *     ancho: number,
     *     alto: number,
     *     matriz: Array<Array<string>>,
     *     metadatos: {nombre?: string, alcalde?: string}
     * }>} Promesa con los datos del mapa validados.
     * @throws {Error} Si el archivo es inválido o no cumple validaciones.
     */
    static procesarArchivoTXT(archivo) {
        return new Promise((resolve, reject) => {
            if (!archivo) {
                reject(new Error('No se seleccionó un archivo.'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (evento) => {
                try {
                    const contenidoTXT = evento.target.result;
                    const resultado = this._parsearYValidarTXT(contenidoTXT);
                    resolve(resultado);

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('No se pudo leer el archivo.'));
            };

            reader.readAsText(archivo);
        });
    }

    /**
     * Parsea y valida el contenido del archivo TXT.
     *
     * @private
     * @param {string} contenidoTXT Contenido del archivo TXT.
     * @returns {Object} Datos validados con matriz, ancho, alto y metadatos.
     * @throws {Error} Si el formato no es válido o no cumple las reglas de validación.
     */
    static _parsearYValidarTXT(contenidoTXT) {
        // Eliminar espacios en blanco al inicio y final, dividir por líneas
        const lineas = contenidoTXT.trim().split('\n').map(linea => linea.trim());

        if (lineas.length === 0) {
            throw new Error('El archivo TXT está vacío.');
        }

        // Extraer dimensiones de la primera línea
        const primeraLinea = lineas[0];
        const dimensiones = this._parsearDimensiones(primeraLinea);
        const { ancho, alto } = dimensiones;

        // Validar rango de dimensiones
        this._validarDimensiones(ancho, alto);

        // Extraer matriz de las siguientes líneas
        const lineasMatriz = lineas.slice(1);

        if (lineasMatriz.length === 0) {
            throw new Error(`Se esperaban ${alto} filas de mapa pero el archivo está vacío después de las dimensiones.`);
        }

        if (lineasMatriz.length !== alto) {
            throw new Error(
                `El archivo tiene ${lineasMatriz.length} filas pero las dimensiones especifican ${alto} filas.`
            );
        }

        // Parsear la matriz
        const matriz = lineasMatriz.map((linea, numeroFila) => {
            return this._parsearFila(linea, numeroFila, ancho);
        });

        // Validar consistencia de la matriz (ya se valida en _parsearFila)
        // Validar etiquetas
        this._validarEtiquetas(matriz);

        return {
            ancho,
            alto,
            matriz,
            metadatos: {} // No hay metadatos en archivos TXT
        };
    }

    /**
     * Parsea la primera línea para extraer dimensiones.
     * Acepta formatos: "15 15" o "15x15"
     *
     * @private
     * @param {string} primeraLinea Primera línea del archivo.
     * @returns {{ancho: number, alto: number}} Las dimensiones del mapa.
     * @throws {Error} Si el formato de dimensiones es inválido.
     */
    static _parsearDimensiones(primeraLinea) {
        // Intentar parsear con espacio: "15 15"
        let partes = primeraLinea.split(' ').filter(p => p.length > 0);

        if (partes.length !== 2) {
            // Intentar parsear con 'x': "15x15"
            partes = primeraLinea.split('x').filter(p => p.length > 0);
        }

        if (partes.length !== 2) {
            throw new Error(
                `Formato de dimensiones inválido. Primera línea debe ser "ANCHO ALTO" (ej: "15 15") o "ANCHOxALTO" (ej: "15x15"). ` +
                `Se recibió: "${primeraLinea}"`
            );
        }

        const ancho = parseInt(partes[0], 10);
        const alto = parseInt(partes[1], 10);

        if (isNaN(ancho) || isNaN(alto)) {
            throw new Error(
                `Las dimensiones deben ser números enteros. Se recibió: ancho="${partes[0]}", alto="${partes[1]}"`
            );
        }

        if (ancho <= 0 || alto <= 0) {
            throw new Error(
                `Las dimensiones deben ser positivas. Se recibió: ancho=${ancho}, alto=${alto}`
            );
        }

        return { ancho, alto };
    }

    /**
     * Parsea una fila del mapa.
     *
     * @private
     * @param {string} linea Línea del archivo a parsear.
     * @param {number} numeroFila Número de la fila (para reportes de error).
     * @param {number} anchoEsperado Ancho esperado de la fila.
     * @returns {Array<string>} Array con las etiquetas de la fila.
     * @throws {Error} Si la fila tiene formato inválido o número incorrecto de columnas.
     */
    static _parsearFila(linea, numeroFila, anchoEsperado) {
        if (!linea || linea.length === 0) {
            throw new Error(
                `Fila ${numeroFila + 1} está vacía. Se esperaban ${anchoEsperado} etiquetas separadas por espacios.`
            );
        }

        const etiquetas = linea.split(/\s+/).filter(etiqueta => etiqueta.length > 0);

        if (etiquetas.length !== anchoEsperado) {
            throw new Error(
                `Fila ${numeroFila + 1} tiene ${etiquetas.length} elementos pero se esperaban ${anchoEsperado}. ` +
                `Contenido: "${linea}"`
            );
        }

        // Validar que todas las etiquetas sean strings válidos
        for (let i = 0; i < etiquetas.length; i++) {
            const etiqueta = etiquetas[i];
            if (!etiqueta || typeof etiqueta !== 'string') {
                throw new Error(
                    `Fila ${numeroFila + 1}, columna ${i + 1}: etiqueta inválida.`
                );
            }
        }

        return etiquetas;
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
