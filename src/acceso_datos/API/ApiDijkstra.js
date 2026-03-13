import ApiExternos from './ApiExternos.js';

export default class ApiDijkstra extends ApiExternos {
    /**
     * @param {Array<Array<number>>} [ruta=[]]
     */
    constructor(ruta = []) {
        super('http://127.0.0.1:5000');
        this.ruta = ruta;
    }

    /**
     * Solicita al microservicio el cálculo de ruta más corta.
     * @param {{map:Array<Array<number>>, start:[number,number], end:[number,number]}} [datosMapa={}]
     * @returns {Promise<any>}
     */
    async calcularRuta(datosMapa = {}) {
        this.validarDatosRuta(datosMapa);

        const endpoint = this.obtenerEndpointCalculoRuta();
        const opcionesPeticion = this.crearOpcionesPost(datosMapa);
        const respuesta = await fetch(`${this.baseUrl}${endpoint}`, opcionesPeticion);
        const resultado = await this.procesarRespuestaJson(respuesta);

        this.ruta = resultado?.route ?? [];
        return resultado;
    }

    /**
     * Devuelve el endpoint del servicio de cálculo de ruta.
     * @returns {string}
     */
    obtenerEndpointCalculoRuta() {
        return '/api/calculate-route';
    }

    /**
     * Construye opciones de fetch para una petición POST JSON.
     * @param {object} datosMapa
     * @returns {{method:string, headers:Record<string,string>, body:string}}
     */
    crearOpcionesPost(datosMapa) {
        return {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosMapa)
        };
    }

    /**
     * Valida la estructura mínima requerida para calcular una ruta.
     * @param {{map?:any, start?:any, end?:any}} [datosMapa={}]
     */
    validarDatosRuta(datosMapa = {}) {
        const tieneMapaValido = Array.isArray(datosMapa.map);
        const tieneInicioValido = this.esCoordenadaValida(datosMapa.start);
        const tieneFinValido = this.esCoordenadaValida(datosMapa.end);

        if (!tieneMapaValido || !tieneInicioValido || !tieneFinValido) {
            throw new Error('Formato invalido. Se requiere: { map: number[][], start: [fila,columna], end: [fila,columna] }.');
        }
    }

    /**
     * Verifica que una coordenada tenga formato [fila, columna].
     * @param {any} coordenada
     * @returns {boolean}
     */
    esCoordenadaValida(coordenada) {
        return Array.isArray(coordenada)
            && coordenada.length === 2
            && Number.isInteger(coordenada[0])
            && Number.isInteger(coordenada[1]);
    }

    /**
     * Procesa la respuesta HTTP y normaliza el error si aplica.
     * @param {Response} respuesta
     * @returns {Promise<any>}
     */
    async procesarRespuestaJson(respuesta) {
        const datosRespuesta = await respuesta.json();

        if (!respuesta.ok) {
            const mensajeError = datosRespuesta?.error || 'Error al calcular la ruta';
            throw new Error(mensajeError);
        }

        return datosRespuesta;
    }
}