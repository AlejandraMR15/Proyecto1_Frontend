import ApiExternos from './ApiExternos.js';

export default class ApiNoticias extends ApiExternos {
    static CANTIDAD_NOTICIAS = 5;

    constructor(ultimasNoticias = []) {
        super('https://newsapi.org');
        this.apiKey = this.leerApiKeyDesdeEnv();
        this.ultimasNoticias = ultimasNoticias; 
    }

    // Metodo principal: consulta noticias y retorna solo los campos requeridos.
    async obtenerInformacion(pais = 'co') {
        const datosNoticias = await this.obtenerDatosNoticias(pais);
        const noticiasFormateadas = this.formatearNoticias(datosNoticias?.articles ?? []);

        this.actualizarEstadoNoticias(noticiasFormateadas);

        return {
            pais,
            cantidad: noticiasFormateadas.length,
            noticias: noticiasFormateadas
        };
    }

    // Consulta el endpoint de titulares con los parametros definidos.
    async obtenerDatosNoticias(pais) {
        const endpointNoticias = '/v2/everything';
        const parametrosConsulta = this.crearParametrosConsulta(pais);
        return super.obtenerInformacion(endpointNoticias, parametrosConsulta);
    }

    // Construye parametros del endpoint con pageSize fijo en 5 y la API key de entorno.
    crearParametrosConsulta(pais) {
        return {
            q: 'Colombia',
            language: 'es',
            pageSize: ApiNoticias.CANTIDAD_NOTICIAS,
            apiKey: this.apiKey
        };
    }

    // Lee la API key directamente desde el archivo .env expuesto por Vite.
    leerApiKeyDesdeEnv() {
        const apiKey = import.meta.env?.VITE_NEWS_API_KEY;

        if (!apiKey) {
            throw new Error('No se encontro VITE_NEWS_API_KEY en el archivo .env');
        }

        return apiKey;
    }

    // Mapea cada articulo al formato JSON solicitado por la capa de presentacion.
    formatearNoticias(articulos = []) {
        return articulos.slice(0, ApiNoticias.CANTIDAD_NOTICIAS).map((articulo) => ({
            titulo: articulo?.title ?? '',
            descripcionBreve: articulo?.description ?? '',
            imagenUrl: articulo?.urlToImage || null,
            enlaceNoticia: articulo?.url ?? ''
        }));
    }

    // Mantiene actualizado el estado interno con las noticias recientes.
    actualizarEstadoNoticias(noticiasFormateadas = []) {
        this.ultimasNoticias = noticiasFormateadas;
    }
}