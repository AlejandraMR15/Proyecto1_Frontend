class Edificio extends Construccion {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo) {
        super(costo);
        this.id = id;
        this.nombre = nombre.toLowerCase();
        this.costoMantenimiento = costoMantenimiento;
        this.consumoElectricidad = consumoElectricidad;
        this.consumoAgua = consumoAgua;
        this.esActivo = esActivo;
    }

    // Marca el edificio como activo (operando normalmente).
    activar() {
        this.esActivo = true;
    }

    // Marca el edificio como inactivo (sin consumo ni producción).
    desactivar() {
        this.esActivo = false;
    }

    // Retorna el costo de mantenimiento del edificio.
    calcularMantenimiento() {
        return this.costoMantenimiento;
    }

    /**
     * Procesa un turno: descuenta mantenimiento, electricidad y agua del objeto Recursos.
     * Si no hay suficiente electricidad o dinero, el edificio se desactiva.
     * @param {Recursos} recursos
     */
    procesarTurno(recursos) {
        if (!this.esActivo) return;

        // Descuenta mantenimiento en dinero
        recursos.egresosDinero(this.costoMantenimiento);

        // Descuenta consumos de recursos
        recursos.actualizarElectricidad(-this.consumoElectricidad);
        recursos.actualizarAgua(-this.consumoAgua);
    }

    // Retorna un objeto con la información relevante del edificio.
    getInformacion() {
        return {
            id: this.id,
            nombre: this.nombre,
            costo: this.costo,
            costoMantenimiento: this.costoMantenimiento,
            consumoElectricidad: this.consumoElectricidad,
            consumoAgua: this.consumoAgua,
            esActivo: this.esActivo
        };
    }
}