import Edificio from '../edificio.js';
export default class PlantasDeUtilidad extends Edificio {
    /**
     * @param {number} costo
     * @param {string|number} id
     * @param {string} nombre
     * @param {number} costoMantenimiento
     * @param {number} consumoElectricidad
     * @param {number} consumoAgua
     * @param {boolean} esActivo
     * @param {string} tipoDeUtilidad
     * @param {number} produccionPorTurno
     */
    constructor(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo, tipoDeUtilidad, produccionPorTurno) {
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, consumoAgua, esActivo);
        // 'electrica' | 'agua'
        this.tipoDeUtilidad = tipoDeUtilidad;
        // Cantidad de recurso producida por turno
        this.produccionPorTurno = produccionPorTurno;
    }

    /**
     * Retorna la producción del turno sin aplicarla a recursos.
     * @param {Recursos} recursos
     * @returns {{electricidad: number, agua: number}}
     */
    procesarProduccion(recursos) {
        if (!this.esActivo) return { electricidad: 0, agua: 0 };

        if (this.tipoDeUtilidad === 'electrica') {
            return { electricidad: this.produccionPorTurno, agua: 0 };
        } else if (this.tipoDeUtilidad === 'agua') {
            // La planta de agua solo opera si pudo cubrir su consumo eléctrico del turno.
            if (recursos.electricidad >= 0) {
                return { electricidad: 0, agua: this.produccionPorTurno };
            }
        }

        return { electricidad: 0, agua: 0 };
    }

    /**
     * Ejecuta la producción del turno y actualiza el objeto Recursos.
     * - Planta eléctrica: incrementa electricidad.
     * - Planta de agua: produce solo si, tras descontar su consumo del turno,
     *   la electricidad no queda en negativo.
     * @deprecated Usar procesarProduccion() en su lugar
     * @param {Recursos} recursos
     */
    produccion(recursos) {
        return this.procesarProduccion(recursos);
    }

    /**
     * Procesa un turno: primero consumo, luego retorna producción.
     * @param {Recursos} recursos
     */
    procesarTurno(recursos) {
        this.procesarConsumo(recursos);
        return this.procesarProduccion(recursos);
    }

    /**
     * Devuelve información de la planta de utilidad.
     * @returns {object}
     */
    getInformacion() {
        const tipoTexto = this.tipoDeUtilidad === 'electrica' ? '⚡ Electricidad' : '💧 Agua';
        return {
            ...super.getInformacion(),
            tipoDeUtilidad: tipoTexto,
            produccionPorTurno: `${this.produccionPorTurno} ${tipoTexto.split(' ')[1].toLowerCase()}`
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