class Vias extends Construccion {
    constructor(costo) {
        super(costo);
        // Las vías no consumen recursos operativos
        // y sirven como celdas transitables (valor 1) para el algoritmo de Dijkstra
    }

    /**
     * Retorna true para indicar que esta celda es transitable.
     * Usado al construir la matriz del mapa para el sistema de rutas.
     */
    esTransitable() {
        return true;
    }
}