export default class SistemaTurnos {
    constructor(duracion = 1000) {
        this.estado = false;
        this.duracion = duracion;
        this.intervalo = null;
    }

    iniciar(callback) {
        if (this.estado) return;

        this.estado = true;

        this.intervalo = setInterval(() => {
            if (callback) callback();
        }, this.duracion);
    }

    detener() {
        this.estado = false;
        clearInterval(this.intervalo);
    }

    cambiarDuracion(nuevaDuracion) {
        this.duracion = nuevaDuracion;
        if (this.estado) {
            this.detener();
            this.iniciar();
        }
    }

    estaCorriendo() {
        return this.estado;
    }
}