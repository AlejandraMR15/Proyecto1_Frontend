export default class ApiExternos {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    // Metodo heredado comun: arma query params y ejecuta la peticion HTTP.
    async obtenerInformacion(endpoint, parametros = {}) {
        const parametrosLimpios = this.limpiarParametros(parametros);
        const queryString = new URLSearchParams(parametrosLimpios).toString();
        const endpointConParametros = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.realizarPeticion(endpointConParametros);
    }

    // Evita enviar parametros undefined, null o vacios.
    limpiarParametros(parametros = {}) {
        const entradasValidas = Object.entries(parametros).filter(([, valor]) => this.esValorValido(valor));
        return Object.fromEntries(entradasValidas);
    }

    // Define que valores pueden viajar en query params.
    esValorValido(valor) {
        return valor !== undefined && valor !== null && String(valor).trim() !== '';
    }

    async realizarPeticion(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status} al consultar ${url}`);
        }

        return respuesta.json();
    }
}