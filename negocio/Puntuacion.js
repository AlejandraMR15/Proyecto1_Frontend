/**
 * Clase encargada de calcular y gestionar la puntuación del juego.
 * Maneja bonificaciones y penalizaciones basadas en métricas de la ciudad.
 */
export default class Puntuacion {

    /**
     * Calcula la puntuación total basada en datos de la ciudad.
     * @param {object} datosCiudad - Objeto con métricas de la ciudad.
     * @param {number} datosCiudad.poblacion - Número de ciudadanos.
     * @param {number} datosCiudad.felicidad - Felicidad promedio.
     * @param {number} datosCiudad.dinero - Cantidad de dinero.
     * @returns {number} Puntuación calculada con bonificaciones aplicadas.
     */
    calcular(datosCiudad) {
        let puntaje = 0;

        puntaje += datosCiudad.poblacion * 10;
        puntaje += datosCiudad.felicidad * 5;
        puntaje += datosCiudad.dinero || 0;

        return this.aplicarBonificaciones(puntaje);
    }

    /**
     * Aplica bonificaciones a la puntuación si supera ciertos umbrales.
     * @param {number} puntaje - Puntuación base.
     * @returns {number} Puntuación con bonificaciones.
     */
    aplicarBonificaciones(puntaje) {
        if (puntaje > 10000) {
            puntaje *= 1.1;
        }
        return puntaje;
    }

    /**
     * Aplica penalizaciones a la puntuación.
     * @param {number} puntaje - Puntuación actual.
     * @param {number} [penalizacion=0] - Cantidad a restar.
     * @returns {number} Puntuación penalizada.
     */
    aplicarPenalizaciones(puntaje, penalizacion = 0) {
        return puntaje - penalizacion;
    }
}