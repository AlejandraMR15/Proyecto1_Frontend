class Recursos {
    constructor(dinero= 50000, electricidad= 0, agua= 0, comida= 0) {
        this.dinero = dinero;
        this.electricidad = electricidad;
        this.agua = agua;
        this.comida = comida;
    }

    // Descuenta una cantidad de dinero. Retorna false si no hay suficiente saldo.
    egresosDinero(cantidad) {
        if (this.dinero < cantidad) return false;
        this.dinero -= cantidad;
        return true;
    }

    // Ajusta el balance de agua (puede recibir valores negativos para consumo).
    actualizarAgua(cantidad) {
        this.agua += cantidad;
    }

    // Ajusta el balance de electricidad (puede recibir valores negativos para consumo).
    actualizarElectricidad(cantidad) {
        this.electricidad += cantidad;
    }

    // Ajusta el balance de comida (puede recibir valores negativos para consumo).
    actualizarComida(cantidad) {
        this.comida += cantidad;
    }
}