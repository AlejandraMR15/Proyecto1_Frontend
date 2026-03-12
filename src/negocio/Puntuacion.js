/**
 * Clase encargada de calcular y gestionar la puntuación del juego.
 * Maneja bonificaciones y penalizaciones basadas en métricas de la ciudad.
 *
 * Fórmula completa (según spec):
 *   score = (poblacion×10) + (felicidad×5) + (dinero÷100)
 *         + (numEdificios×50) + (electricidad×2) + (agua×2)
 *         + bonificaciones - penalizaciones
 */
export default class Puntuacion {

    /**
     * Calcula la puntuación total basada en datos de la ciudad.
     * @param {object} datosCiudad - Objeto con métricas de la ciudad.
     * @param {number} datosCiudad.poblacion         - Número de ciudadanos.
     * @param {number} datosCiudad.felicidad          - Felicidad promedio (0-100).
     * @param {number} datosCiudad.dinero             - Cantidad de dinero.
     * @param {number} [datosCiudad.numEdificios=0]   - Número total de edificios construidos.
     * @param {number} [datosCiudad.electricidad=0]   - Balance de electricidad.
     * @param {number} [datosCiudad.agua=0]           - Balance de agua.
     * @param {number} [datosCiudad.penalizacion=0]   - Penalización acumulada manual.
     * @returns {number} Puntuación calculada con bonificaciones y penalizaciones aplicadas.
     */
    calcular(datosCiudad) {
        const {
            poblacion     = 0,
            felicidad     = 0,
            dinero        = 0,
            numEdificios  = 0,
            electricidad  = 0,
            agua          = 0,
            penalizacion  = 0
        } = datosCiudad;

        let puntaje = 0;

        // Fórmula base según spec
        puntaje += poblacion    * 10;
        puntaje += felicidad    * 5;
        puntaje += Math.floor(dinero / 100);
        puntaje += numEdificios * 50;
        puntaje += electricidad * 2;
        puntaje += agua         * 2;

        // Aplicar bonificaciones por hitos alcanzados
        puntaje = this.aplicarBonificaciones(puntaje, datosCiudad);

        // Aplicar penalizaciones
        puntaje = this.aplicarPenalizaciones(puntaje, penalizacion);

        return Math.max(0, Math.round(puntaje));
    }

    /**
     * Aplica bonificaciones al puntaje según hitos de la ciudad.
     *
     * Bonificaciones del spec:
     *   +500  → Población alcanza 50 ciudadanos
     *   +300  → Felicidad promedio supera 70
     *   +200  → Balance de electricidad positivo (ciudad autosuficiente)
     *   +1000 → Población supera 200 ciudadanos (ciudad próspera)
     *
     * @param {number} puntaje        - Puntuación base ya calculada.
     * @param {object} datosCiudad    - Métricas de la ciudad para evaluar hitos.
     * @returns {number} Puntuación con bonificaciones sumadas.
     */
    aplicarBonificaciones(puntaje, datosCiudad = {}) {
        const {
            poblacion    = 0,
            felicidad    = 0,
            electricidad = 0
        } = datosCiudad;

        // +500: Ciudad habitada — población de al menos 50 ciudadanos
        if (poblacion >= 50) {
            puntaje += 500;
        }

        // +300: Ciudad feliz — felicidad promedio superior a 70
        if (felicidad > 70) {
            puntaje += 300;
        }

        // +200: Ciudad autosuficiente — balance eléctrico positivo
        if (electricidad > 0) {
            puntaje += 200;
        }

        // +1000: Ciudad próspera — población superior a 200 ciudadanos
        if (poblacion > 200) {
            puntaje += 1000;
        }

        return puntaje;
    }

    /**
     * Aplica penalizaciones a la puntuación.
     * @param {number} puntaje          - Puntuación actual.
     * @param {number} [penalizacion=0] - Cantidad a restar (debe ser positiva).
     * @returns {number} Puntuación penalizada.
     */
    aplicarPenalizaciones(puntaje, penalizacion = 0) {
        return puntaje - penalizacion;
    }
}