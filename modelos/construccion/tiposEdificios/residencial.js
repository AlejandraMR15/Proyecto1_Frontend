class Residencial extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, capacidad, residentes) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        this.capacidad = capacidad;
        // Array de objetos Ciudadano que viven aquí
        this.residentes = residentes ?? [];
    }

    // Agrega un ciudadano como residente si hay capacidad disponible.
    // Retorna true si fue asignado, false si el edificio está lleno.
    añadirResidentes(ciudadano) {
        if (!this.tieneCapacidadDisponible()) return false;
        this.residentes.push(ciudadano);
        return true;
    }

    // Elimina un ciudadano de la lista de residentes por su id.
    // Retorna true si fue encontrado y eliminado.
    removerResidentes(ciudadano) {
        const index = this.residentes.findIndex(r => r.id === ciudadano.id);
        if (index === -1) return false;
        this.residentes.splice(index, 1);
        return true;
    }

    // Retorna true si hay espacio para más residentes.
    tieneCapacidadDisponible() {
        return this.residentes.length < this.capacidad;
    }

    // Retorna el número de residentes actuales.
    ocupacion() {
        return this.residentes.length;
    }

    // Calcula el consumo proporcional de electricidad y agua según la ocupación actual.
    // Si no hay residentes el consumo es 0. Los valores base representan el 100% de capacidad.
    calcularConsumoActual() {
        if (this.capacidad === 0) return { electricidad: 0, agua: 0 };
        const proporcion = this.residentes.length / this.capacidad;
        return {
            electricidad: this.consumoElectricidad * proporcion,
            agua: this.consumoAgua * proporcion
        };
    }

    // Sobrescribe procesarTurno para descontar el consumo proporcional a la ocupación actual.
    procesarTurno(recursos) {
        if (!this.esActivo) return;

        recursos.egresosDinero(this.costoMantenimiento);

        const consumo = this.calcularConsumoActual();
        recursos.actualizarElectricidad(-consumo.electricidad);
        recursos.actualizarAgua(-consumo.agua);
    }

    // Sobrescribe getInformacion para incluir datos residenciales.
    getInformacion() {
        return {
            ...super.getInformacion(),
            capacidad: this.capacidad,
            ocupacion: this.ocupacion(),
            tieneCapacidadDisponible: this.tieneCapacidadDisponible(),
            consumoActualElectricidad: consumo.electricidad,
            consumoActualAgua: consumo.agua
        };
    }
}