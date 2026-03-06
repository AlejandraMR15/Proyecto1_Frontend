class Construccion {
    constructor(costo) {
        this.costo = costo;
    }

    puedeConstruirse(ciudad) {
        return ciudad.recursos.dinero >= this.costo;
    }

    ejecutar(ciudad) {
        if (this.puedeConstruirse(ciudad)) {
            ciudad.recursos.dinero -= this.costo;
            ciudad.construcciones.push(this);
            return true;
        }
        return false;
    }
}