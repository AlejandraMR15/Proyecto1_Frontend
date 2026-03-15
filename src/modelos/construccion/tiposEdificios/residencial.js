import Edificio from '../edificio.js';
export default class Residencial extends Edificio {
    /**
     * @param {number} costo
     * @param {string|number} id
     * @param {string} nombre
     * @param {number} costoMantenimiento
     * @param {number} consumoElectricidad
     * @param {number} consumoAgua
     * @param {boolean} esActivo
     * @param {number} capacidad
     * @param {Array<object>} residentes
     */
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, capacidad, residentes) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        this.capacidad = capacidad;
        // Array de objetos Ciudadano que viven aquí
        this.residentes = residentes ?? [];
    }

    /**
     * Agrega un ciudadano como residente si hay capacidad.
     * @param {object} ciudadano
     * @returns {boolean}
     */
    añadirResidentes(ciudadano) {
        if (!this.tieneCapacidadDisponible()) return false;
        this.residentes.push(ciudadano);
        return true;
    }

    /**
     * Elimina un residente por id.
     * @param {object} ciudadano
     * @returns {boolean}
     */
    removerResidentes(ciudadano) {
        const index = this.residentes.findIndex(r => r.id === ciudadano.id);
        if (index === -1) return false;
        this.residentes.splice(index, 1);
        return true;
    }

    /**
     * Indica si hay capacidad libre.
     * @returns {boolean}
     */
    tieneCapacidadDisponible() {
        return this.residentes.length < this.capacidad;
    }

    /**
     * Retorna el número de residentes actuales.
     * @returns {number}
     */
    ocupacion() {
        return this.residentes.length;
    }

    /**
     * Calcula consumo proporcional según ocupación.
     * @returns {{electricidad:number, agua:number}}
     */
    calcularConsumoActual() {
        if (this.capacidad === 0) return { electricidad: 0, agua: 0 };
        const proporcion = this.residentes.length / this.capacidad;
        return {
            electricidad: this.consumoElectricidad * proporcion,
            agua: this.consumoAgua * proporcion
        };
    }

    /**
     * Aplica costos del turno con consumo proporcional.
     * @param {import('../../recursos.js').default} recursos
     */
    procesarTurno(recursos) {
        if (!this.esActivo) return;

        recursos.egresosDinero(this.costoMantenimiento);

        const consumo = this.calcularConsumoActual();
        recursos.actualizarElectricidad(-consumo.electricidad);
        recursos.actualizarAgua(-consumo.agua);
    }

    /**
     * Devuelve información residencial del edificio.
     * @returns {object}
     */
    getInformacion() {
        const consumo = this.calcularConsumoActual();
        return {
            ...super.getInformacion(),
            capacidad: this.capacidad,
            ocupacion: this.ocupacion(),
            tieneCapacidadDisponible: this.tieneCapacidadDisponible(),
            consumoActualElectricidad: consumo.electricidad,
            consumoActualAgua: consumo.agua
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            capacidad:   this.capacidad,
            residentes:  this.residentes.map(r => r.toJSON ? r.toJSON() : r)
        };
    }
}