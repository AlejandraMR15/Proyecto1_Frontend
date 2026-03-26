import Construccion from './construccion.js';
export default class Vias extends Construccion {
    /**
     * @param {number} costo
     * @param {number} [costoMantenimiento=0] - Costo de mantenimiento por turno
     */
    constructor(costo, costoMantenimiento = 0) {
        super(costo);
        // Las vías no consumen recursos operativos
        // y sirven como celdas transitables (valor 1) para el algoritmo de Dijkstra
        // Costo de mantenimiento por turno (0.1% del costo de construcción)
        this.costoMantenimiento = costoMantenimiento;
    }

    /**
     * Retorna true para indicar que esta celda es transitable.
     * Usado al construir la matriz del mapa para el sistema de rutas.
     */
    /**
     * Retorna true para indicar que esta celda es transitable.
     * Usado al construir la matriz del mapa para el sistema de rutas.
     */
    esTransitable() {
        return true;
    }

    /**
     * Devuelve información de la vía.
     * @returns {object}
     */
    getInformacion() {
        return {
            nombre: 'Vía',
            costo: this.costo,
            costoMantenimiento: this.costoMantenimiento
        };
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
            costoMantenimiento: this.costoMantenimiento
        };
    }
}