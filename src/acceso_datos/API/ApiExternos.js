export default class ApiExternos {
    /**
     * @param {string} baseUrl
     */
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Arma query params y ejecuta la petición HTTP.
     * @param {string} endpoint
     * @param {Record<string, any>} [parametros={}]
     * @returns {Promise<any>}
     */
    async obtenerInformacion(endpoint, parametros = {}) {
        const parametrosLimpios = this.limpiarParametros(parametros);
        const queryString = new URLSearchParams(parametrosLimpios).toString();
        const endpointConParametros = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.realizarPeticion(endpointConParametros);
    }

    /**
     * Filtra parámetros inválidos antes de enviarlos en query string.
     * @param {Record<string, any>} [parametros={}]
     * @returns {Record<string, any>}
     */
    limpiarParametros(parametros = {}) {
        const entradasValidas = Object.entries(parametros).filter(([, valor]) => this.esValorValido(valor));
        return Object.fromEntries(entradasValidas);
    }

    /**
     * Determina si un valor puede viajar como parámetro de consulta.
     * @param {any} valor
     * @returns {boolean}
     */
    esValorValido(valor) {
        return valor !== undefined && valor !== null && String(valor).trim() !== '';
    }

    /**
     * Ejecuta la petición HTTP al endpoint indicado.
     * @param {string} endpoint
     * @returns {Promise<any>}
     */
    async realizarPeticion(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status} al consultar ${url}`);
        }

        return respuesta.json();
    }
}