export default class Residencial extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, capacidad, residentes) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        this.capacidad = capacidad;
        // Array de objetos Ciudadano que viven aquí
        this.residentes = residentes ?? [];
    }

    // Agrega un ciudadano como residente si hay capacidad disponible.
    // Retorna true si fue asignado, false si el edificio está lleno.
    añadirResidentes(ciudadano) {
        if (!this.tieneCarpacidadDisponible()) return false;
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
    tieneCarpacidadDisponible() {
        return this.residentes.length < this.capacidad;
    }

    // Retorna el número de residentes actuales.
    ocupacion() {
        return this.residentes.length;
    }

    // Sobrescribe getInformacion para incluir datos residenciales.
    getInformacion() {
        return {
            ...super.getInformacion(),
            capacidad: this.capacidad,
            ocupacion: this.ocupacion(),
            tieneCarpacidadDisponible: this.tieneCarpacidadDisponible()
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