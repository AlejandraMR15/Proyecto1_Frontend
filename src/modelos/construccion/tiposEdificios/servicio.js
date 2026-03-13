import Edificio from '../edificio.js';
export default class Servicio extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, tipoDeServicio, felicidad, radio) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // 'policia' | 'bomberos' | 'hospital'
        this.tipoDeServicio = tipoDeServicio;
        // Puntos de felicidad que aporta a todos los ciudadanos
        this.felicidad = felicidad;
        // Radio de influencia en celdas (no usado en felicidad global, reservado para futuras mecánicas)
        this.radio = radio;
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

    toJSON() {
        return {
            ...super.toJSON(),
            tipoDeServicio: this.tipoDeServicio,
            felicidad:      this.felicidad,
            radio:          this.radio
        };
    }
}