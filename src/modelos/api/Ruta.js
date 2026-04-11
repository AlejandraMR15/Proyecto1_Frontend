export default class Ruta {
    /**
     * Encapsula una ruta calculada por el algoritmo de Dijkstra.
     * @param {Array<Array<number>>} [coordenadas=[]]
     */
    constructor(coordenadas = []) {
        this.coordenadas = coordenadas; // Array de [fila, col]
    }
}
