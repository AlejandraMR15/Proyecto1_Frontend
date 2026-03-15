import ApiExternos from './ApiExternos.js';

export default class ApiRegion extends ApiExternos {
    /**
     * Crea una instancia para consultar datos geográficos de Colombia.
     */
    constructor() {
        super('https://api-colombia.com');
    }

    /**
     * Obtiene el listado de ciudades y el detalle de una ciudad por nombre.
     * @param {string} [nombreCiudad='']
     * @returns {Promise<{ciudadBuscada:string, idCiudad:string|null, ciudades:Array<object>, detalleCiudad:object|null, mensaje?:string}>}
     */
    async obtenerInformacion(nombreCiudad = '') {
        const ciudades = await this.obtenerTodasLasCiudades();
        const idCiudad = this.obtenerIdCiudadPorNombre(ciudades, nombreCiudad);

        if (!idCiudad) {
            return {
                ciudadBuscada: nombreCiudad,
                idCiudad: null,
                ciudades,
                detalleCiudad: null,
                mensaje: 'No se encontro una ciudad con ese nombre.'
            };
        }

        const detalleCiudad = await this.obtenerDetalleCiudadPorId(idCiudad);

        return {
            ciudadBuscada: nombreCiudad,
            idCiudad,
            ciudades,
            detalleCiudad
        };
    }

    /**
     * Obtiene todas las ciudades disponibles desde la API.
     * @returns {Promise<Array<object>>}
     */
    async obtenerTodasLasCiudades() {
        const endpointCiudades = '/api/v1/City/';
        return super.obtenerInformacion(endpointCiudades);
    }

    /**
     * Obtiene el detalle de una ciudad a partir de su id.
     * @param {string|number} idCiudad
     * @returns {Promise<object>}
     */
    async obtenerDetalleCiudadPorId(idCiudad) {
        const endpointCiudadPorId = `/api/v1/City/${idCiudad}`;
        return super.obtenerInformacion(endpointCiudadPorId);
    }

    /**
     * Busca una ciudad por nombre y devuelve su id.
     * @param {Array<object>} [ciudades=[]]
     * @param {string} [nombreCiudad='']
     * @returns {string|number|null}
     */
    obtenerIdCiudadPorNombre(ciudades = [], nombreCiudad = '') {
        const nombreNormalizado = this.normalizarTexto(nombreCiudad);

        if (!nombreNormalizado) {
            return null;
        }

        const ciudadEncontrada = ciudades.find((ciudad) => {
            const nombreActual = this.normalizarTexto(ciudad?.name);
            return nombreActual === nombreNormalizado;
        });

        return ciudadEncontrada?.id ?? null;
    }

    /**
     * Normaliza texto para comparaciones de búsqueda.
     * @param {string} [texto='']
     * @returns {string}
     */
    normalizarTexto(texto = '') {
        return String(texto).trim().toLowerCase();
    }
}
