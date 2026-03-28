/**
 * Constantes que definen los estados posibles del juego.
 * Centraliza los valores para evitar errores de tipeo y facilitar cambios.
 */
export const ESTADOS = {
    JUGANDO: "jugando",     // Estado cuando el juego está activo y ejecutando turnos.
    PAUSA: "pausa",         // Estado cuando el juego está pausado.
    GAME_OVER: "game_over"  // Estado cuando el juego ha terminado.
};

/**
 * Clase que gestiona el estado actual del juego.
 * Proporciona métodos para cambiar y verificar el estado.
 */
export class EstadoDeJuego {

    /**
     * Crea una instancia del estado de juego, inicializado en pausa.
     */
    constructor() {
        this.estadoActual = ESTADOS.PAUSA;
    }

    /**
     * Cambia el estado actual del juego.
     * @param {string} nuevoEstado - Nuevo estado (usar constantes de ESTADOS).
     */
    cambiarEstado(nuevoEstado) {
        this.estadoActual = nuevoEstado;
    }

    /**
     * Verifica si el juego está en estado de jugando.
     * @returns {boolean} True si está jugando.
     */
    estaJugando() {
        return this.estadoActual === ESTADOS.JUGANDO;
    }

    /**
     * Verifica si el juego está en pausa.
     * @returns {boolean} True si está en pausa.
     */
    estaEnPausa() {
        return this.estadoActual === ESTADOS.PAUSA;
    }

    /**
     * Verifica si el juego ha terminado.
     * @returns {boolean} True si es game over.
     */
    esGameOver() {
        return this.estadoActual === ESTADOS.GAME_OVER;
    }

}