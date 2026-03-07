class PlantasDeUtilidad extends Edificio {
    constructor(costo, id, nombre, costoMantenimiento, esActivo, tipoDeUtilidad, produccionPorTurno) {
        // Planta eléctrica: consumoElectricidad=0, consumoAgua=0
        // Planta de agua:   consumoElectricidad=20, consumoAgua=0
        const consumoElectricidad = tipoDeUtilidad === 'electrica' ? 0 : 20;
        super(costo, id, nombre, costoMantenimiento, consumoElectricidad, 0, esActivo);
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
}