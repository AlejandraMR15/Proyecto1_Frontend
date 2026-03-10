import ApiExternos from './ApiExternos.js';

export default class ApiDijkstra extends ApiExternos {
    constructor(ruta = []) {
        super();
        this.ruta = ruta;
    }

    obtenerInformacion() {}
}