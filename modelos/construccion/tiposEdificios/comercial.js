class Comercial extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, esActivo, empleo, empleados, ingresoPorTurno) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, 0, esActivo);
        // Máximo de puestos de trabajo disponibles
        this.empleo = empleo;
        // Array de objetos Ciudadano empleados aquí
        this.empleados = empleados ?? [];
        this.ingresoPorTurno = ingresoPorTurno;
    }

    // Contrata a un ciudadano si hay vacantes. Retorna true si fue contratado.
    añadirEmpleado(ciudadano) {
        if (!this.tieneCapacidadDisponible()) return false;
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
    tieneCapacidadDisponible() {
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
            tieneCapacidadDisponible: this.tieneCapacidadDisponible()
        };
    }
}