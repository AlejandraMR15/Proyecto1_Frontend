class Industrial extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, empleo, empleados, montonDeProduccion) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // Máximo de puestos de trabajo disponibles
        this.empleo = empleo;
        // Array de objetos Ciudadano empleados aquí
        this.empleados = empleados ?? [];
        // Se define según el nombre: granja = 'comida', cualquier otro = 'dinero'
        this.tipoDeProduccion = nombre.toLowerCase().includes('granja') ? 'comida' : 'dinero';
        // Cantidad producida por turno (dinero o comida según tipoDeProduccion)
        this.montonDeProduccion = montonDeProduccion;
    }

    // Contrata a un ciudadano si hay vacantes. Retorna true si fue contratado.
    añadirEmpleado(ciudadano) {
        if (this.empleados.length >= this.empleo) return false;
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

    // Retorna el ingreso en dinero que genera por turno.
    // Las granjas no generan dinero directamente, retornan 0.
    ingresosPorTurno() {
        if (!this.esActivo) return 0;
        return this.tipoDeProduccion === 'dinero' ? this.montonDeProduccion : 0;
    }

    /**
     * Aplica la producción al objeto Recursos.
     * Si faltan agua o electricidad se reduce la producción al 50%.
     * @param {Recursos} recursos
     */
    producirRecursos(recursos) {
        if (!this.esActivo) return;

        // Detecta si faltan recursos críticos para esta industria
        const faltanRecursos = recursos.electricidad < 0 || recursos.agua < 0;
        const factor = faltanRecursos ? 0.5 : 1;

        if (this.tipoDeProduccion === 'dinero') {
            recursos.dinero += Math.floor(this.montonDeProduccion * factor);
        } else if (this.tipoDeProduccion === 'comida') {
            recursos.actualizarComida(Math.floor(this.montonDeProduccion * factor));
        }
    }

    // Procesa el turno: aplica consumos y luego ejecuta la producción.
    procesarTurno(recursos) {
        super.procesarTurno(recursos);
        this.producirRecursos(recursos);
    }

    // Sobrescribe getInformacion para incluir datos industriales.
    getInformacion() {
        return {
            ...super.getInformacion(),
            empleo: this.empleo,
            empleadosActuales: this.empleados.length,
            tipoDeProduccion: this.tipoDeProduccion,
            produccionPorTurno: this.montonDeProduccion
        };
    }
}