/**
 * Clase que gestiona el sistema de turnos basado en tiempo.
 * Ejecuta un callback a intervalos regulares para simular turnos.
 */
export default class SistemaTurnos {

    /**
     * Crea una instancia del sistema de turnos.
     * @param {number} [duracion=10000] - Duración de cada turno en milisegundos.
     */
    constructor(duracion = 10000) {
        this.estado = false;
        this.duracion = duracion;
        this.intervalo = null;
        this.timeoutInicial = null;
        this.callback = null;
        this.inicioTramoMs = 0;
        this.restanteMs = duracion;
    }

    /**
     * Inicia el sistema de turnos, ejecutando el callback cada intervalo.
     * @param {function} callback - Función a ejecutar en cada turno.
     */
    iniciar(callback) {
        if (this.intervalo !== null || this.timeoutInicial !== null) {
            return;
        }
        if (callback) {
            this.callback = callback;
        }
        if (!this.callback) return;

        this.estado = true;

        const primerDelay =
            Number.isFinite(this.restanteMs) && this.restanteMs > 0
                ? this.restanteMs
                : this.duracion;

        this.inicioTramoMs = Date.now();
        this.timeoutInicial = setTimeout(() => {
            this.timeoutInicial = null;
            if (!this.estado) return;

            if (this.callback) {
                this.callback();
            }

            if (!this.estado) return;

            this.restanteMs = this.duracion;
            this.inicioTramoMs = Date.now();
            this.intervalo = setInterval(() => {
                if (this.callback) {
                    this.callback();
                }
                this.inicioTramoMs = Date.now();
                this.restanteMs = this.duracion;
            }, this.duracion);
        }, primerDelay);

    }

    /**
     * Detiene el sistema de turnos.
     */
    detener() {
        const ahora = Date.now();

        if (this.timeoutInicial !== null) {
            const transcurrido = Math.max(0, ahora - this.inicioTramoMs);
            const restante = this.restanteMs - transcurrido;
            this.restanteMs = Math.max(0, restante);
            clearTimeout(this.timeoutInicial);
            this.timeoutInicial = null;
        }

        if (this.intervalo !== null) {
            const transcurrido = Math.max(0, ahora - this.inicioTramoMs);
            const restante = this.duracion - transcurrido;
            this.restanteMs = Math.max(0, restante);
            clearInterval(this.intervalo);
            this.intervalo = null;
        }

        if (this.restanteMs <= 0) {
            this.restanteMs = this.duracion;
        }

        this.estado = false;
    }

    /**
     * Cambia la duración de los turnos y reinicia si está corriendo.
     * @param {number} nuevaDuracion - Nueva duración en milisegundos.
     */
    cambiarDuracion(nuevaDuracion) {
        this.duracion = nuevaDuracion;
        this.restanteMs = nuevaDuracion;
        if (this.estado) {
            this.detener();
            this.iniciar(this.callback);
        }
    }

    /**
     * Verifica si el sistema de turnos está corriendo.
     * @returns {boolean} True si está activo.
     */
    estaCorriendo() {
        return this.estado;
    }

}