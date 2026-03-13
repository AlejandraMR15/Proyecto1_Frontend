import Construccion from './construccion.js';
export default class Parques extends Construccion {
    constructor(costo, felicidad)  {
        super(costo);
        // Puntos de felicidad que aporta a todos los ciudadanos (+5 según spec)
        this.felicidad = felicidad;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            felicidad: this.felicidad
        };
    }
}