export default class CiudadRegion {
    /**
     * Encapsula los datos de una ciudad de Colombia.
     * @param {string|number} [id='']
     * @param {string} [name='']
     */
    constructor(id = '', name = '') {
        this.id = id;
        this.name = name;
    }
}
