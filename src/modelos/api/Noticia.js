export default class Noticia {
    /**
     * Encapsula los datos de una noticia obtenida de la API.
     * @param {string} [titulo='']
     * @param {string} [descripcionBreve='']
     * @param {string|null} [imagenUrl=null]
     * @param {string} [enlaceNoticia='']
     */
    constructor(titulo = '', descripcionBreve = '', imagenUrl = null, enlaceNoticia = '') {
        this.titulo = titulo;
        this.descripcionBreve = descripcionBreve;
        this.imagenUrl = imagenUrl;
        this.enlaceNoticia = enlaceNoticia;
    }
}
