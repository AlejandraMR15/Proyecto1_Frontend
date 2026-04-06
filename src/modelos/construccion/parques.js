import Construccion from './construccion.js';
export default class Parques extends Construccion {
    /**
     * @param {number} costo
     * @param {number} felicidad
     * @param {number} [costoMantenimiento=0] - Costo de mantenimiento por turno
     */
    constructor(costo, felicidad, costoMantenimiento = 0)  {
        super(costo);
        // Puntos de felicidad que aporta a todos los ciudadanos (+5 según spec)
        this.felicidad = felicidad;
        // Costo de mantenimiento por turno (0.1% del costo de construcción)
        this.costoMantenimiento = costoMantenimiento;
    }

    /**
     * Devuelve información del parque.
     * @returns {object}
     */
    getInformacion() {
        return {
            nombre: 'Parque',
            costo: this.costo,
            costoMantenimiento: this.costoMantenimiento,
            felicidadAportada: `${this.felicidad} puntos`
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
     * Procesa consumo del turno: descuenta el costo de mantenimiento.
     * @param {import('../recursos.js').default} recursos
     */
    procesarConsumo(recursos) {
        if (this.costoMantenimiento > 0) {
            recursos.egresosDinero(this.costoMantenimiento);
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            felicidad: this.felicidad,
            costoMantenimiento: this.costoMantenimiento
        };
    }
}