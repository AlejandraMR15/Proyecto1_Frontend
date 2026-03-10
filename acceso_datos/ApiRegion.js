import ApiExternos from './ApiExternos.js';

export default class ApiRegion extends ApiExternos {
    constructor() {
        super('https://api-colombia.com');
    }

    // Metodo principal: coordina la consulta de ciudades y el detalle por id.
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

    // Endpoint 1: obtiene toda la informacion de ciudades.
    async obtenerTodasLasCiudades() {
        const endpointCiudades = '/api/v1/City/';
        return super.obtenerInformacion(endpointCiudades);
    }

    // Endpoint 2: obtiene la informacion de una ciudad a partir de su id.
    async obtenerDetalleCiudadPorId(idCiudad) {
        const endpointCiudadPorId = `/api/v1/City/${idCiudad}`;
        return super.obtenerInformacion(endpointCiudadPorId);
    }

    // Busca por nombre en la lista de ciudades y retorna el id encontrado.
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

    // Estandariza comparaciones de texto para busqueda por nombre.
    normalizarTexto(texto = '') {
        return String(texto).trim().toLowerCase();
    }
}
