import ApiExternos from './ApiExternos.js';
import Noticia from '../../modelos/api/Noticia.js';
import { NEWS_KEY } from '../../../keys.js';

export default class ApiNoticias extends ApiExternos {
    static CANTIDAD_NOTICIAS = 5;
    static PAIS_DEFECTO = 'Colombia';

    /**
     * @param {string} [paisConsulta='Colombia']
     */
    constructor(paisConsulta = ApiNoticias.PAIS_DEFECTO) {
        // api.codetabs.com es un proxy CORS público gratuito más estable que allorigins.
        // NewsAPI bloquea peticiones directas desde el navegador (plan gratuito),
        // pero sí permite peticiones desde servidores. El proxy actúa de intermediario.
        super('https://api.codetabs.com/v1/proxy');
        this.apiKey = this.leerApiKey();
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
     * Consulta noticias y retorna objetos Noticia.
     * @returns {Promise<{pais:string, cantidad:number, noticias:Array<Noticia>}>}
     */
    async obtenerInformacion() {
        const datosNoticias = await this.obtenerDatosNoticias();
        const noticiasFormateadas = this.formatearNoticias(datosNoticias?.articles ?? []);
        const noticiasObjetos = this.crearObjetosNoticia(noticiasFormateadas);

        return {
            pais: this.paisConsulta,
            cantidad: noticiasObjetos.length,
            noticias: noticiasObjetos
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
     * Convierte objetos planos de noticias a instancias de Noticia.
     * @param {Array<object>} [noticiasFormateadas=[]]
     * @returns {Array<Noticia>}
     */
    crearObjetosNoticia(noticiasFormateadas = []) {
        return noticiasFormateadas.map((noticia) =>
            new Noticia(
                noticia?.titulo ?? '',
                noticia?.descripcionBreve ?? '',
                noticia?.imagenUrl || null,
                noticia?.enlaceNoticia ?? ''
            )
        );
    }
}