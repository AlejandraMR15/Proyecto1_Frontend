import ApiExternos from './ApiExternos.js';
import { NEWS_KEY } from '../../../keys.js';

export default class ApiNoticias extends ApiExternos {
    static CANTIDAD_NOTICIAS = 5;
    static PAIS_DEFECTO = 'Colombia';

    /**
     * @param {Array<object>} [ultimasNoticias=[]]
     * @param {string} [paisConsulta='Colombia']
     */
    constructor(ultimasNoticias = [], paisConsulta = ApiNoticias.PAIS_DEFECTO) {
        // api.codetabs.com es un proxy CORS público gratuito más estable que allorigins.
        // NewsAPI bloquea peticiones directas desde el navegador (plan gratuito),
        // pero sí permite peticiones desde servidores. El proxy actúa de intermediario.
        super('https://api.codetabs.com/v1/proxy');
        this.apiKey = this.leerApiKey();
        this.ultimasNoticias = ultimasNoticias;
        this.paisConsulta = paisConsulta;
    }

    /**
     * Lee la API key de NewsAPI desde keys.js.
     * @returns {string}
     */
    leerApiKey() {
        if (!NEWS_KEY) {
            throw new Error('No se encontro NEWS_KEY en keys.js');
        }
        return NEWS_KEY;
    }

    /**
     * Consulta noticias y retorna solo los campos necesarios para la UI.
     * @returns {Promise<{pais:string, cantidad:number, noticias:Array<object>}>}
     */
    async obtenerInformacion() {
        const datosNoticias = await this.obtenerDatosNoticias();
        const noticiasFormateadas = this.formatearNoticias(datosNoticias?.articles ?? []);

        this.actualizarEstadoNoticias(noticiasFormateadas);

        return {
            pais: this.paisConsulta,
            cantidad: noticiasFormateadas.length,
            noticias: noticiasFormateadas
        };
    }

    /**
     * Consulta el endpoint de noticias con los parámetros definidos.
     * @returns {Promise<any>}
     */
    async obtenerDatosNoticias() {
        // Construye la URL completa de NewsAPI y la envuelve en el proxy api.codetabs.com.
        // codetabs recibe la URL destino como query param "quest" y devuelve el JSON directamente.
        const parametros = this.crearParametrosConsulta();
        const queryString = new URLSearchParams(parametros).toString();
        const urlNewsApi = `https://newsapi.org/v2/everything?${queryString}`;
 
        // codetabs usa "quest" y devuelve JSON directamente
        const urlProxy = `?quest=${encodeURIComponent(urlNewsApi)}`;
        const respuestaProxy = await this.realizarPeticion(urlProxy);
 
        // codetabs devuelve directamente el JSON de NewsAPI
        return respuestaProxy;
    }

    /**
     * Construye parámetros de consulta para el endpoint de noticias.
     * @returns {{q:string, language:string, pageSize:number, apiKey:string}}
     */
    crearParametrosConsulta() {
        return {
            q: this.paisConsulta,
            language: 'es',
            pageSize: ApiNoticias.CANTIDAD_NOTICIAS,
            apiKey: this.apiKey
        };
    }

    /**
     * Mapea artículos al formato requerido por la capa de presentación.
     * @param {Array<object>} [articulos=[]]
     * @returns {Array<{titulo:string, descripcionBreve:string, imagenUrl:string|null, enlaceNoticia:string}>}
     */
    formatearNoticias(articulos = []) {
        return articulos.slice(0, ApiNoticias.CANTIDAD_NOTICIAS).map((articulo) => ({
            titulo: articulo?.title ?? '',
            descripcionBreve: articulo?.description ?? '',
            imagenUrl: articulo?.urlToImage || null,
            enlaceNoticia: articulo?.url ?? ''
        }));
    }

    /**
     * Actualiza el estado interno con las noticias más recientes.
     * @param {Array<object>} [noticiasFormateadas=[]]
     */
    actualizarEstadoNoticias(noticiasFormateadas = []) {
        this.ultimasNoticias = noticiasFormateadas;
    }
}