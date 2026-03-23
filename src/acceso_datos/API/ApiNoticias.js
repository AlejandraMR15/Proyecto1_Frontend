import ApiExternos from './ApiExternos.js';
import { NEWS_KEY } from '../../../keys.js';

export default class ApiNoticias extends ApiExternos {
    static CANTIDAD_NOTICIAS = 5;

    /**
     * @param {Array<object>} [ultimasNoticias=[]]
     */
    constructor(ultimasNoticias = []) {
        // api.codetabs.com es un proxy CORS público gratuito más estable que allorigins.
        // NewsAPI bloquea peticiones directas desde el navegador (plan gratuito),
        // pero sí permite peticiones desde servidores. El proxy actúa de intermediario.
        super('https://api.codetabs.com/v1/proxy');
        this.apiKey = this.leerApiKey();
        this.ultimasNoticias = ultimasNoticias; 
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
     * @param {string} [pais='co']
     * @returns {Promise<{pais:string, cantidad:number, noticias:Array<object>}>}
     */
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

    /**
     * Consulta el endpoint de noticias con los parámetros definidos.
     * @param {string} pais
     * @returns {Promise<any>}
     */
    async obtenerDatosNoticias(pais) {
        // Construye la URL completa de NewsAPI y la envuelve en el proxy api.codetabs.com.
        // codetabs recibe la URL destino como query param "quest" y devuelve el JSON directamente.
        const parametros = this.crearParametrosConsulta(pais);
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
     * @param {string} pais
     * @returns {{q:string, language:string, pageSize:number, apiKey:string}}
     */
    crearParametrosConsulta() {
        return {
            q: 'Colombia',
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