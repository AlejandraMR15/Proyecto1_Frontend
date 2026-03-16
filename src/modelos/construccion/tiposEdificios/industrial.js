import Edificio from '../edificio.js';
export default class Industrial extends Edificio {
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
     * @param {string} tipoDeProduccion
     * @param {number} produccion
     */
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, empleo, empleados, tipoDeProduccion, produccion) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // Máximo de puestos de trabajo disponibles
        this.empleo = empleo;
        // Array de objetos Ciudadano empleados aquí
        this.empleados = empleados ?? [];
        // 'fabrica' genera dinero; 'granja' genera comida
        this.tipoDeProduccion = tipoDeProduccion;
        // Cantidad producida por turno (dinero o comida según tipoDeProduccion)
        this.produccion = produccion;
    }

    /**
     * Contrata a un ciudadano si hay vacante.
     * @param {object} ciudadano
     * @returns {boolean}
     */
    añadirEmpleado(ciudadano) {
        if (this.empleados.length >= this.empleo) return false;
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
     * Retorna el ingreso monetario del turno para fábricas.
     * @returns {number}
     */
    ingresosPorTurno() {
        if (!this.esActivo) return 0;
        return this.tipoDeProduccion === 'fabrica' ? this.produccion : 0;
    }

    /**
     * Aplica la producción al objeto Recursos.
     * Si faltan agua o electricidad se reduce la producción al 50%.
     * @param {Recursos} recursos
     */
    producirRecursos(recursos) {
        if (!this.esActivo) return { dinero: 0, comida: 0 };

        // Detecta si faltan recursos críticos para esta industria
        const faltanRecursos = recursos.electricidad < 0 || recursos.agua < 0;
        const factor = faltanRecursos ? 0.5 : 1;

        if (this.tipoDeProduccion === 'fabrica') {
            return { dinero: Math.floor(this.produccion * factor), comida: 0 };
        } else if (this.tipoDeProduccion === 'granja') {
            return { dinero: 0, comida: Math.floor(this.produccion * factor) };
        }

        return { dinero: 0, comida: 0 };
    }

    /**
     * Procesa consumo y producción del turno.
     * @param {import('../../recursos.js').default} recursos
     */
    procesarTurno(recursos) {
        super.procesarTurno(recursos);
        return this.producirRecursos(recursos);
    }

    /**
     * Devuelve información industrial del edificio.
     * @returns {object}
     */
    getInformacion() {
        return {
            ...super.getInformacion(),
            empleo: this.empleo,
            empleadosActuales: this.empleados.length,
            tipoDeProduccion: this.tipoDeProduccion,
            produccionPorTurno: this.produccion
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            empleo:           this.empleo,
            empleados:        this.empleados.map(e => e.toJSON ? e.toJSON() : e),
            tipoDeProduccion: this.tipoDeProduccion,
            produccion:       this.produccion
        };
    }
}