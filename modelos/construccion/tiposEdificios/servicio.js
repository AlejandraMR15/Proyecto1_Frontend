class Servicio extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, tipoDeServicio, felicidad, radio) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // 'policia' | 'bomberos' | 'hospital'
        this.tipoDeServicio = tipoDeServicio;
        // Puntos de felicidad que aporta a todos los ciudadanos
        this.felicidad = felicidad;
        // Radio de influencia en celdas (no usado en felicidad global, reservado para futuras mecánicas)
        this.radio = radio;
    }

    /**
     * Aplica el bonus de felicidad de este servicio a todos los ciudadanos.
     * Solo actúa si el edificio está activo.
     * @param {Ciudadano[]} ciudadanos  - Array con todos los ciudadanos de la ciudad
     */
    aplicarFelicidad(ciudadanos) {
        if (!this.esActivo) return;
        for (const ciudadano of ciudadanos) {
            ciudadano.felicidad = Math.min(100, ciudadano.felicidad + this.felicidad);
        }
    }

    // Sobrescribe getInformacion para incluir datos de servicio.
    getInformacion() {
        return {
            ...super.getInformacion(),
            tipoDeServicio: this.tipoDeServicio,
            felicidadAportada: this.felicidad,
            radio: this.radio
        };
    }
}