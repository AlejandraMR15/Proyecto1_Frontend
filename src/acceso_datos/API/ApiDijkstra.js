import ApiExternos from './ApiExternos.js';

export default class ApiDijkstra extends ApiExternos {
    constructor(ruta = []) {
        super('http://127.0.0.1:5000');
        this.ruta = ruta;
    }

    // Metodo principal: solicita al microservicio el calculo de ruta y retorna JSON.
    async calcularRuta(datosMapa = {}) {
        this.validarDatosRuta(datosMapa);

        const endpoint = this.obtenerEndpointCalculoRuta();
        const opcionesPeticion = this.crearOpcionesPost(datosMapa);
        const respuesta = await fetch(`${this.baseUrl}${endpoint}`, opcionesPeticion);
        const resultado = await this.procesarRespuestaJson(respuesta);

        this.ruta = resultado?.route ?? [];
        return resultado;
    }

    // Define el endpoint del microservicio para mantener una unica fuente de verdad.
    obtenerEndpointCalculoRuta() {
        return '/api/calculate-route';
    }

    // Construye la configuracion POST con body JSON para el backend.
    crearOpcionesPost(datosMapa) {
        return {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosMapa)
        };
    }

    // Garantiza que la entrada tenga el formato esperado por el microservicio.
    validarDatosRuta(datosMapa = {}) {
        const tieneMapaValido = Array.isArray(datosMapa.map);
        const tieneInicioValido = this.esCoordenadaValida(datosMapa.start);
        const tieneFinValido = this.esCoordenadaValida(datosMapa.end);

        if (!tieneMapaValido || !tieneInicioValido || !tieneFinValido) {
            throw new Error('Formato invalido. Se requiere: { map: number[][], start: [fila,columna], end: [fila,columna] }.');
        }
    }

    // Verifica coordenadas con formato [fila, columna].
    esCoordenadaValida(coordenada) {
        return Array.isArray(coordenada)
            && coordenada.length === 2
            && Number.isInteger(coordenada[0])
            && Number.isInteger(coordenada[1]);
    }

    // Lee JSON tanto en exito como en error y normaliza el mensaje lanzado.
    async procesarRespuestaJson(respuesta) {
        const datosRespuesta = await respuesta.json();

        if (!respuesta.ok) {
            const mensajeError = datosRespuesta?.error || 'Error al calcular la ruta';
            throw new Error(mensajeError);
        }

        return datosRespuesta;
    }
}