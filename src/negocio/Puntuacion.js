/**
 * Clase encargada de calcular y gestionar la puntuación del juego.
 * Maneja bonificaciones y penalizaciones basadas en métricas de la ciudad.
 *
 * Fórmula base:
 *   score = (población × 10) + (felicidad_promedio × 5) + (dinero ÷ 100)
 *         + (número_edificios × 50) + (balance_electricidad × 2) + (balance_agua × 2)
 *         + bonificaciones - penalizaciones
 *
 * Bonificaciones:
 *   +500  → Todos los ciudadanos empleados
 *   +300  → Felicidad promedio > 80
 *   +200  → Todos los recursos positivos (dinero, electricidad y agua > 0)
 *   +1000 → Ciudad con más de 1.000 habitantes
 *
 * Penalizaciones:
 *   -500  → Dinero negativo
 *   -300  → Electricidad negativa
 *   -300  → Agua negativa
 *   -400  → Felicidad promedio < 40
 *   -10   → Por cada ciudadano desempleado
 */
export default class Puntuacion {

    /**
     * Calcula la puntuación total basada en datos de la ciudad.
     * @param {object} datosCiudad - Objeto con métricas de la ciudad.
     * @param {number} datosCiudad.poblacion          - Número total de ciudadanos.
     * @param {number} datosCiudad.felicidad           - Felicidad promedio (0-100).
     * @param {number} datosCiudad.dinero              - Balance de dinero actual.
     * @param {number} [datosCiudad.numEdificios=0]    - Número total de edificios construidos.
     * @param {number} [datosCiudad.electricidad=0]    - Balance de electricidad.
     * @param {number} [datosCiudad.agua=0]            - Balance de agua.
     * @param {number} [datosCiudad.desempleados=0]    - Cantidad de ciudadanos sin empleo.
     * @returns {number} Puntuación final (mínimo 0).
     */
    calcular(datosCiudad) {
        const {
            poblacion    = 0,
            felicidad    = 0,
            dinero       = 0,
            numEdificios = 0,
            electricidad = 0,
            agua         = 0,
            desempleados = 0
        } = datosCiudad;

        let puntaje = 0;
        puntaje += poblacion    * 10;
        puntaje += felicidad    * 5;
        puntaje += Math.floor(dinero / 100);
        puntaje += numEdificios * 50;
        puntaje += electricidad * 2;
        puntaje += agua         * 2;

        puntaje = this.aplicarBonificaciones(puntaje, datosCiudad);
        puntaje = this.aplicarPenalizaciones(puntaje, datosCiudad);

        return Math.max(0, Math.round(puntaje));
    }

    /**
     * Aplica bonificaciones al puntaje según hitos de la ciudad.
     * @param {number} puntaje     - Puntuación base ya calculada.
     * @param {object} datosCiudad - Métricas de la ciudad para evaluar hitos.
     * @returns {number} Puntuación con bonificaciones sumadas.
     */
    aplicarBonificaciones(puntaje, datosCiudad = {}) {
        const {
            poblacion    = 0,
            felicidad    = 0,
            dinero       = 0,
            electricidad = 0,
            agua         = 0,
            desempleados = 0
        } = datosCiudad;

        // +500: Todos los ciudadanos empleados (hay ciudadanos y ninguno desempleado)
        if (poblacion > 0 && desempleados === 0) {
            puntaje += 500;
        }

        // +300: Felicidad promedio superior a 80
        if (felicidad > 80) {
            puntaje += 300;
        }

        // +200: Todos los recursos positivos
        if (dinero > 0 && electricidad > 0 && agua > 0) {
            puntaje += 200;
        }

        // +1000: Más de 1.000 habitantes
        if (poblacion > 1000) {
            puntaje += 1000;
        }

        return puntaje;
    }

    /**
     * Aplica penalizaciones al puntaje según condiciones negativas de la ciudad.
     * @param {number} puntaje     - Puntuación actual.
     * @param {object} datosCiudad - Métricas de la ciudad para evaluar penalizaciones.
     * @returns {number} Puntuación penalizada.
     */
    aplicarPenalizaciones(puntaje, datosCiudad = {}) {
        const {
            felicidad    = 0,
            dinero       = 0,
            electricidad = 0,
            agua         = 0,
            desempleados = 0
        } = datosCiudad;

        if (dinero < 0)        puntaje -= 500;
        if (electricidad < 0)  puntaje -= 300;
        if (agua < 0)          puntaje -= 300;
        if (felicidad < 40)    puntaje -= 400;
        if (desempleados > 0)  puntaje -= desempleados * 10;

        return puntaje;
    }
}