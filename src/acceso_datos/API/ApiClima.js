import ApiExternos from './ApiExternos.js';
import { OPENWEATHER_KEY } from '../../../keys.js';

export default class ApiClima extends ApiExternos {
    /**
     * @param {number} [temperatura=0]
     * @param {string} [condicionClimatica='']
     * @param {number} [humedad=0]
     * @param {number} [velocidadViento=0]
     */
    constructor(temperatura = 0, condicionClimatica = '', humedad = 0, velocidadViento = 0) {
        super('https://api.openweathermap.org');
        this.apiKey = this.leerApiKey();
        this.temperatura = temperatura;
        this.condicionClimatica = condicionClimatica;
        this.humedad = humedad;
        this.velocidadViento = velocidadViento;
    }

    /**
     * Lee la API key de OpenWeather desde keys.js.
     * @returns {string}
     */
    leerApiKey() {
        if (!OPENWEATHER_KEY) {
            throw new Error('No se encontro OPENWEATHER_KEY en keys.js');
        }
        return OPENWEATHER_KEY;
    }

    /**
     * Obtiene coordenadas por ciudad y luego consulta el clima actual.
     * @param {string} [nombreCiudad='']
     * @returns {Promise<{temperatura:number|null, condicionClimatica:string, humedad:number|null, velocidadViento:number|null}>}
     * @throws {Error} Si nombreCiudad es inválido o no hay conexión a APIs externas
     */
    async obtenerInformacion(nombreCiudad = '') {
        if (!nombreCiudad || typeof nombreCiudad !== 'string' || nombreCiudad.trim() === '') {
            throw new Error('nombreCiudad debe ser una cadena de texto válida y no estar vacía');
        }
        
        const coordenadasCiudad = await this.obtenerCoordenadasPorCiudad(nombreCiudad);
        const datosClima = await this.obtenerDatosClima(coordenadasCiudad.latitud, coordenadasCiudad.longitud);
        const climaFormateado = this.formatearRespuestaClima(datosClima);

        this.actualizarEstadoClimatico(climaFormateado);
        return climaFormateado;
    }

    /**
     * Consulta geocodificación para obtener latitud y longitud de una ciudad.
     * @param {string} nombreCiudad
     * @returns {Promise<{latitud:number, longitud:number}>}
     */
    async obtenerCoordenadasPorCiudad(nombreCiudad) {
        const endpointGeocoding = '/geo/1.0/direct';
        const parametrosGeocoding = this.crearParametrosGeocodificacion(nombreCiudad);
        const datosGeocodificacion = await super.obtenerInformacion(endpointGeocoding, parametrosGeocoding);
        const ciudadEncontrada = datosGeocodificacion?.[0];

        if (!ciudadEncontrada) {
            throw new Error('No se encontraron coordenadas para la ciudad indicada.');
        }

        return {
            latitud: ciudadEncontrada.lat,
            longitud: ciudadEncontrada.lon
        };
    }

    /**
     * Construye parámetros para geocodificación por nombre de ciudad.
     * @param {string} nombreCiudad
     * @returns {{q:string, limit:number, appid:string}}
     */
    crearParametrosGeocodificacion(nombreCiudad) {
        return {
            q: nombreCiudad,
            limit: 1,
            appid: this.apiKey
        };
    }

    /**
     * Consulta el endpoint de clima por coordenadas.
     * @param {number} latitud
     * @param {number} longitud
     * @returns {Promise<any>}
     */
    async obtenerDatosClima(latitud, longitud) {
        const endpointClima = '/data/2.5/weather';
        const parametrosClima = this.crearParametrosClima(latitud, longitud);

        return super.obtenerInformacion(endpointClima, parametrosClima);
    }

    /**
     * Construye parámetros para la consulta de clima.
     * @param {number} latitud
     * @param {number} longitud
     * @returns {{lat:number, lon:number, appid:string, units:string}}
     */
    crearParametrosClima(latitud, longitud) {
        return {
            lat: latitud,
            lon: longitud,
            appid: this.apiKey,
            units: 'metric'
        };
    }

    /**
     * Actualiza el estado interno de clima.
     * @param {{temperatura:number|null, condicionClimatica:string, humedad:number|null, velocidadViento:number|null}} climaFormateado
     */
    actualizarEstadoClimatico(climaFormateado) {
        this.temperatura = climaFormateado.temperatura;
        this.condicionClimatica = climaFormateado.condicionClimatica;
        this.humedad = climaFormateado.humedad;
        this.velocidadViento = climaFormateado.velocidadViento;
    }

    /**
     * Extrae únicamente los campos requeridos del payload de OpenWeather.
     * @param {any} datosClima
     * @returns {{temperatura:number|null, condicionClimatica:string, humedad:number|null, velocidadViento:number|null}}
     */
    formatearRespuestaClima(datosClima) {
        return {
            temperatura: datosClima?.main?.temp ?? null,
            condicionClimatica: datosClima?.weather?.[0]?.description ?? '',
            humedad: datosClima?.main?.humidity ?? null,
            velocidadViento: datosClima?.wind?.speed ?? null
        };
    }
}