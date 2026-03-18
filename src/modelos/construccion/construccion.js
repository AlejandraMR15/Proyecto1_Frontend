export default class Construccion {
    /**
     * @param {number} costo
     */
    constructor(costo) {
        this.costo = costo;
    }

    /**
     * Indica si la ciudad tiene presupuesto para construir.
     * @param {import('../ciudad.js').default} ciudad
     * @returns {boolean}
     */
    puedeConstruirse(ciudad) {
        return ciudad.recursos.dinero >= this.costo;
    }

    /**
     * Ejecuta la construcción: descuenta costo y registra la instancia.
     * @param {import('../ciudad.js').default} ciudad
     * @returns {boolean}
     */
    ejecutar(ciudad) {
        if (this.puedeConstruirse(ciudad)) {
            ciudad.recursos.dinero -= this.costo;
            ciudad.construcciones.push(this);
            return true;
        }
        return false;
    }

    /**
     * Serializa la construcción a un objeto plano.
     * Las subclases deben sobreescribir este método e incluir
     * `...super.toJSON()` para heredar los campos base.
     * El campo `tipo` identifica la clase concreta para el factory
     * de reconstrucción en Ciudad.fromJSON().
     * @returns {object}
     */
    toJSON() {
        return {
            tipo:   this.constructor.name,
            costo:  this.costo,
            _coordX: this._coordX,
            _coordY: this._coordY
        };
    }
}