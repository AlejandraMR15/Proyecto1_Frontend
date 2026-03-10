import ApiExternos from './ApiExternos.js';

export default class ApiClima extends ApiExternos {
    constructor(temperatura = 0, condicionClimatica = '', humedad = 0, velocidadViento = 0) {
        super('https://api.openweathermap.org');
        this.apiKey = this.leerApiKeyDesdeEnv();
        this.temperatura = temperatura;
        this.condicionClimatica = condicionClimatica;
        this.humedad = humedad;
        this.velocidadViento = velocidadViento;
    }

    // Lee la API key directamente desde el archivo .env expuesto por Vite.
    leerApiKeyDesdeEnv() {
        const apiKey = import.meta.env?.VITE_OPENWEATHER_API_KEY;

        if (!apiKey) {
            throw new Error('No se encontro VITE_OPENWEATHER_API_KEY en el archivo .env');
        }

        return apiKey;
    }

    // Metodo principal: obtiene coordenadas por ciudad y luego consulta el clima.
    async obtenerInformacion(nombreCiudad = '') {
        const coordenadasCiudad = await this.obtenerCoordenadasPorCiudad(nombreCiudad);
        const datosClima = await this.obtenerDatosClima(coordenadasCiudad.latitud, coordenadasCiudad.longitud);
        const climaFormateado = this.formatearRespuestaClima(datosClima);

        this.actualizarEstadoClimatico(climaFormateado);
        return climaFormateado;
    }

    // Consulta la API de geocodificacion para encontrar latitud y longitud de la ciudad.
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

    // Arma parametros para obtener coordenadas desde nombre de ciudad.
    crearParametrosGeocodificacion(nombreCiudad) {
        return {
            q: nombreCiudad,
            limit: 1,
            appid: this.apiKey
        };
    }

    // Consulta la API principal de clima con latitud y longitud.
    async obtenerDatosClima(latitud, longitud) {
        const endpointClima = '/data/2.5/weather';
        const parametrosClima = this.crearParametrosClima(latitud, longitud);

        return super.obtenerInformacion(endpointClima, parametrosClima);
    }

    // Arma parametros de consulta para el endpoint de clima.
    crearParametrosClima(latitud, longitud) {
        return {
            lat: latitud,
            lon: longitud,
            appid: this.apiKey,
            units: 'metric'
        };
    }

    // Mantiene sincronizadas las propiedades de estado de la clase.
    actualizarEstadoClimatico(climaFormateado) {
        this.temperatura = climaFormateado.temperatura;
        this.condicionClimatica = climaFormateado.condicionClimatica;
        this.humedad = climaFormateado.humedad;
        this.velocidadViento = climaFormateado.velocidadViento;
    }

    // Extrae solo los campos requeridos para el JSON final.
    formatearRespuestaClima(datosClima) {
        return {
            temperatura: datosClima?.main?.temp ?? null,
            condicionClimatica: datosClima?.weather?.[0]?.description ?? '',
            humedad: datosClima?.main?.humidity ?? null,
            velocidadViento: datosClima?.wind?.speed ?? null
        };
    }
}