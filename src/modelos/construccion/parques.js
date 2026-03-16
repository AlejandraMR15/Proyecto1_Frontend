import Construccion from './construccion.js';
export default class Parques extends Construccion {
    /**
     * @param {number} costo
     * @param {number} felicidad
     */
    constructor(costo, felicidad)  {
        super(costo);
        // Puntos de felicidad que aporta a todos los ciudadanos (+5 según spec)
        this.felicidad = felicidad;
    }

    /**
     * Devuelve información del parque.
     * @returns {object}
     */
    getInformacion() {
        return {
            nombre: 'Parque',
            costo: this.costo,
            felicidadAportada: `😊 ${this.felicidad} puntos`
        };
    }

    /**
     * Los parques no producen recursos.
     * @returns {{}}
     */
    procesarProduccion(recursos) {
        return {};
    }

    /**
     * Los parques no consumen recursos.
     */
    procesarConsumo(recursos) {
        // Los parques no consumen nada
    }

    toJSON() {
        return {
            ...super.toJSON(),
            felicidad: this.felicidad
        };
    }
}