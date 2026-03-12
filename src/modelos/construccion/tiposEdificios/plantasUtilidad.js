import Edificio from '../edificio.js';
export default class PlantasDeUtilidad extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, tipoDeUtilidad, produccionPorTurno) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // 'electrica' | 'agua'
        this.tipoDeUtilidad = tipoDeUtilidad;
        // Cantidad de recurso producida por turno
        this.produccionPorTurno = produccionPorTurno;
    }

    /**
     * Ejecuta la producción del turno y actualiza el objeto Recursos.
     * - Planta eléctrica: incrementa electricidad.
     * - Planta de agua: solo produce si hay electricidad suficiente.
     * @param {Recursos} recursos
     */
    produccion(recursos) {
        if (!this.esActivo) return;

        if (this.tipoDeUtilidad === 'electrica') {
            recursos.actualizarElectricidad(this.produccionPorTurno);
        } else if (this.tipoDeUtilidad === 'agua') {
            // La planta de agua necesita electricidad para funcionar
            if (recursos.electricidad >= this.consumoElectricidad) {
                recursos.actualizarAgua(this.produccionPorTurno);
            }
        }
    }

    // Procesa el turno: primero produce recursos, luego aplica consumos.
    procesarTurno(recursos) {
        this.produccion(recursos);
        super.procesarTurno(recursos);
    }

    // Sobrescribe getInformacion para incluir datos de utilidad.
    getInformacion() {
        return {
            ...super.getInformacion(),
            tipoDeUtilidad: this.tipoDeUtilidad,
            produccionPorTurno: this.produccionPorTurno
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            tipoDeUtilidad:    this.tipoDeUtilidad,
            produccionPorTurno: this.produccionPorTurno
        };
    }
}