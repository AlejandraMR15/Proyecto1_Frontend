import Edificio from '../edificio.js';
export default class Comercial extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, empleo, empleados, ingresoPorTurno) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // Máximo de puestos de trabajo disponibles
        this.empleo = empleo;
        // Array de objetos Ciudadano empleados aquí
        this.empleados = empleados ?? [];
        this.ingresoPorTurno = ingresoPorTurno;
    }

    // Contrata a un ciudadano si hay vacantes. Retorna true si fue contratado.
    añadirEmpleado(ciudadano) {
        if (!this.tieneEmpleoDisponible()) return false;
        this.empleados.push(ciudadano);
        return true;
    }

    // Despide a un ciudadano por su id. Retorna true si fue encontrado y eliminado.
    removerEmpleado(ciudadano) {
        const index = this.empleados.findIndex(e => e.id === ciudadano.id);
        if (index === -1) return false;
        this.empleados.splice(index, 1);
        return true;
    }

    // Retorna true si el número de empleados actuales es menor al máximo de empleos.
    tieneEmpleoDisponible() {
        return this.empleados.length < this.empleo;
    }

    // Retorna true si el edificio está activo y tiene electricidad para operar.
    // (La verificación de electricidad real queda en Ciudad/procesarTurno;
    //  aquí solo comprueba que esActivo sea true.)
    tieneIngresos() {
        return this.esActivo;
    }

    // Retorna el ingreso generado en el turno actual (0 si no está activo).
    generaIngresos() {
        return this.tieneIngresos() ? this.ingresoPorTurno : 0;
    }

    // Procesa el turno: aplica consumos y abona ingresos al objeto Recursos.
    procesarTurno(recursos) {
        super.procesarTurno(recursos);
        // Un edificio comercial no genera ingresos si la electricidad es negativa
        if (recursos.electricidad >= 0) {
            recursos.dinero += this.generaIngresos();
        }
    }

    // Sobrescribe getInformacion para incluir datos comerciales.
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