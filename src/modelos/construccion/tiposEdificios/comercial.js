import Edificio from '../edificio.js';
export default class Comercial extends Edificio {
    /**
     * @param {number} costo
     * @param {string|number} id
     * @param {string} nombre
     * @param {number} costoMantenimiento
     * @param {number} consumoElectricidad
     * @param {number} consumoAgua
     * @param {boolean} esActivo
     * @param {number} empleo
     * @param {Array<object>} empleados
     * @param {number} ingresoPorTurno
     */
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, empleo, empleados, ingresoPorTurno) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // Máximo de puestos de trabajo disponibles
        this.empleo = empleo;
        // Array de objetos Ciudadano empleados aquí
        this.empleados = empleados ?? [];
        this.ingresoPorTurno = ingresoPorTurno;
    }

    /**
     * Contrata a un ciudadano si existe vacante.
     * @param {object} ciudadano
     * @returns {boolean}
     */
    añadirEmpleado(ciudadano) {
        if (!this.tieneEmpleoDisponible()) return false;
        this.empleados.push(ciudadano);
        return true;
    }

    /**
     * Elimina un empleado por id.
     * @param {object} ciudadano
     * @returns {boolean}
     */
    removerEmpleado(ciudadano) {
        const index = this.empleados.findIndex(e => e.id === ciudadano.id);
        if (index === -1) return false;
        this.empleados.splice(index, 1);
        return true;
    }

    /**
     * Verifica si hay vacantes disponibles.
     * @returns {boolean}
     */
    tieneEmpleoDisponible() {
        return this.empleados.length < this.empleo;
    }

    /**
     * Indica si el edificio puede generar ingresos este turno.
     * @returns {boolean}
     */
    tieneIngresos() {
        return this.esActivo;
    }

    /**
     * Retorna el ingreso bruto del turno.
     * @returns {number}
     */
    generaIngresos() {
        return this.tieneIngresos() ? this.ingresoPorTurno : 0;
    }

    /**
     * Aplica consumos e ingresos del turno.
     * @param {import('../../recursos.js').default} recursos
     */
    procesarTurno(recursos) {
        super.procesarTurno(recursos);
        // Un edificio comercial no genera ingresos si la electricidad es negativa
        if (recursos.electricidad >= 0) {
            return { dinero: this.generaIngresos() };
        }

        return { dinero: 0 };
    }

    /**
     * Devuelve información comercial del edificio.
     * @returns {object}
     */
    getInformacion() {
        return {
            ...super.getInformacion(),
            empleo: this.empleo,
            empleadosActuales: this.empleados.length,
            ingresoPorTurno: this.ingresoPorTurno,
            tieneEmpleoDisponible: this.tieneEmpleoDisponible()
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            empleo:          this.empleo,
            empleados:       this.empleados.map(e => e.toJSON ? e.toJSON() : e),
            ingresoPorTurno: this.ingresoPorTurno
        };
    }
}