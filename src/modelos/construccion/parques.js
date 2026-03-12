import Construccion from './construccion.js';
export default class Parques extends Construccion {
    constructor(costo, felicidad)  {
        super(costo);
        // Puntos de felicidad que aporta a todos los ciudadanos (+5 según spec)
        this.felicidad = felicidad;
    }

    /**
     * Aplica el bonus de felicidad del parque a todos los ciudadanos de la ciudad.
     * @param {Ciudadano[]} ciudadanos  - Array con todos los ciudadanos de la ciudad
     */
    aplicarFelicidad(ciudadanos) {
        for (const ciudadano of ciudadanos) {
            ciudadano.felicidad = Math.min(100, ciudadano.felicidad + this.felicidad);
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            felicidad: this.felicidad
        };
    }
}