/**
 * CIUDAD VIRTUAL — GestorRutas.js (Lógica)
 *
 * Gestiona la lógica de cálculo de rutas:
 *  - Recibe origen y destino.
 *  - Construye el payload para ApiDijkstra.
 *  - Retorna la ruta calculada.
 *
 * NO contiene visualización ni manejo de UI.
 * NO contiene lógica del algoritmo Dijkstra; esa responsabilidad pertenece
 * exclusivamente a ApiDijkstra.js.
 */

import ApiDijkstra from '../../acceso_datos/API/ApiDijkstra.js';

// Instancia reutilizable de la API de rutas
const apiDijkstra = new ApiDijkstra();

/**
 * Calcula una ruta entre dos puntos usando Dijkstra.
 *
 * @param {{ col: number, row: number }} origen
 * @param {{ col: number, row: number }} destino
 * @param {object} mapa - Instancia del mapa para generar matriz
 * @returns {Promise<Array<[number, number]>>} Array de [fila, columna] representando la ruta
 * @throws {Error} Si no existe ruta entre los puntos o falla la API
 */
export async function calcularRuta(origen, destino, mapa) {
    if (!mapa) {
        throw new Error('[GestorRutas] mapa no disponible.');
    }

    // Construir el payload esperado por ApiDijkstra.calcularRuta()
    // La API requiere: { map: number[][], start: [fila, col], end: [fila, col] }
    const payload = {
        map:   mapa.generarMatriz01(),
        start: [origen.row,  origen.col],
        end:   [destino.row, destino.col]
    };

    const resultado = await apiDijkstra.calcularRuta(payload);
    const ruta = resultado?.route ?? [];

    if (ruta.length === 0) {
        throw new Error('No existe ruta entre los puntos seleccionados');
    }

    return ruta;
}