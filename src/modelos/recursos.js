export default class Recursos {
    /**
     * @param {number} [dinero=50000]
     * @param {number} [electricidad=0]
     * @param {number} [agua=0]
     * @param {number} [comida=0]
     */
    constructor(dinero = 50000, electricidad = 0, agua = 0, comida = 0) {
        this.dinero = dinero;
        this.electricidad = electricidad;
        this.agua = agua;
        this.comida = comida;
    }

    /**
     * Descuenta dinero del balance actual.
     * @param {number} cantidad
     * @returns {boolean} false si no hay saldo suficiente.
     */
    egresosDinero(cantidad) {
        if (this.dinero < cantidad) return false;
        this.dinero -= cantidad;
        return true;
    }

    /**
     * Ajusta el balance de agua.
     * @param {number} cantidad
     */
    actualizarAgua(cantidad) {
        this.agua += cantidad;
    }

    /**
     * Ajusta el balance de electricidad.
     * @param {number} cantidad
     */
    actualizarElectricidad(cantidad) {
        this.electricidad += cantidad;
    }

    /**
     * Ajusta el balance de comida.
     * @param {number} cantidad
     */
    actualizarComida(cantidad) {
        this.comida += cantidad;
    }
}