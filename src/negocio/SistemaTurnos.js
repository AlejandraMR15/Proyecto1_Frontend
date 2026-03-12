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
        this.callback = null;
    }

    /**
     * Inicia el sistema de turnos, ejecutando el callback cada intervalo.
     * @param {function} callback - Función a ejecutar en cada turno.
     */
    iniciar(callback) {
        if (this.intervalo !== null) {
            return;
        }
        this.estado = true;
        this.callback = callback;
        this.intervalo = setInterval(() => {
            if (this.callback) {
                this.callback();
            }
        }, this.duracion);

    }

    /**
     * Detiene el sistema de turnos.
     */
    detener() {
        if (this.intervalo !== null) {
            clearInterval(this.intervalo);
            this.intervalo = null;
        }
        this.estado = false;
    }

    /**
     * Cambia la duración de los turnos y reinicia si está corriendo.
     * @param {number} nuevaDuracion - Nueva duración en milisegundos.
     */
    cambiarDuracion(nuevaDuracion) {
        this.duracion = nuevaDuracion;
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