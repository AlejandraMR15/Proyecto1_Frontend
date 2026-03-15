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
     * Ejecuta la producción del turno y actualiza el objeto Recursos.
     * - Planta eléctrica: incrementa electricidad.
     * - Planta de agua: produce solo si, tras descontar su consumo del turno,
     *   la electricidad no queda en negativo.
     * @param {Recursos} recursos
     */
    produccion(recursos) {
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
     * Procesa costos y producción del turno.
     * @param {import('../../recursos.js').default} recursos
     */
    procesarTurno(recursos) {
        super.procesarTurno(recursos);
        return this.produccion(recursos);
    }

    /**
     * Devuelve información de la planta de utilidad.
     * @returns {object}
     */
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