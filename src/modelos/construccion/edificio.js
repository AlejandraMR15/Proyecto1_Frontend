import Construccion from './construccion.js';
export default class Edificio extends Construccion {
    /**
     * @param {number} costo
     * @param {string|number} id
     * @param {string} nombre
     * @param {number} costoMantenimiento
     * @param {number} consumoElectricidad
     * @param {number} consumoAgua
     * @param {boolean} esActivo
     */
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo) {
        super(costo);
        this.id = id;
        this.nombre = nombre;
        this.costoMantenimiento = costoMantenimiento;
        this.consumoElectricidad = consumoElectricidad;
        this.consumoAgua = consumoAgua;
        this.esActivo = esActivo;
    }

    /**
     * Marca el edificio como activo.
     */
    activar() {
        this.esActivo = true;
    }

    /**
     * Marca el edificio como inactivo.
     */
    desactivar() {
        this.esActivo = false;
    }

    /**
     * Retorna el costo de mantenimiento.
     * @returns {number}
     */
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
        const pudoPagarMantenimiento = recursos.egresosDinero(this.costoMantenimiento);
        if (!pudoPagarMantenimiento) {
            this.desactivar();
            return;
        }

        // Descuenta consumos de recursos
        recursos.actualizarElectricidad(-this.consumoElectricidad);
        recursos.actualizarAgua(-this.consumoAgua);
    }

    /**
     * Retorna información resumida del edificio.
     * @returns {object}
     */
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

    /**
     * Serializa el edificio a un objeto plano.
     * Las subclases deben llamar `...super.toJSON()` para incluir estos campos.
     * @returns {object}
     */
    toJSON() {
        return {
            ...super.toJSON(),
            id:                 this.id,
            nombre:             this.nombre,
            costoMantenimiento: this.costoMantenimiento,
            consumoElectricidad:this.consumoElectricidad,
            consumoAgua:        this.consumoAgua,
            esActivo:           this.esActivo
        };
    }
}