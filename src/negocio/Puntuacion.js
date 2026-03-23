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
        puntaje += dinero / 100;
        puntaje += numEdificios * 50;
        puntaje += electricidad * 2;
        puntaje += agua         * 2;

        puntaje = this.aplicarBonificaciones(puntaje, datosCiudad);
        puntaje = this.aplicarPenalizaciones(puntaje, datosCiudad);

        const puntuacionFinal = Math.max(0, Math.round(puntaje));
        
        // Mostrar desglose en consola
        this.obtenerDesglose(datosCiudad);
        
        return puntuacionFinal;
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
            poblacion    = 0,
            felicidad    = 0,
            dinero       = 0,
            electricidad = 0,
            agua         = 0,
            desempleados = 0
        } = datosCiudad;

        if (dinero < 0)        puntaje -= 500;
        if (electricidad < 0)  puntaje -= 300;
        if (agua < 0)          puntaje -= 300;
        if (poblacion > 0 && felicidad < 40)    puntaje -= 400;
        if (desempleados > 0)  puntaje -= desempleados * 10;

        return puntaje;
    }

    /**
     * Obtiene un desglose detallado de la puntuación.
     * @param {object} datosCiudad - Objeto con métricas de la ciudad.
     * @returns {object} Objeto con desglose completo de puntuación e imprime en consola.
     */
    obtenerDesglose(datosCiudad) {
        const {
            poblacion    = 0,
            felicidad    = 0,
            dinero       = 0,
            numEdificios = 0,
            electricidad = 0,
            agua         = 0,
            desempleados = 0
        } = datosCiudad;

        // Cálculo de puntos base
        const puntosPoblacion = poblacion * 10;
        const puntosFelicidad = felicidad * 5;
        const puntosDinero = dinero / 100;
        const puntosEdificios = numEdificios * 50;
        const puntosElectricidad = electricidad * 2;
        const puntosAgua = agua * 2;

        const subtotal = puntosPoblacion + puntosFelicidad + puntosDinero + puntosEdificios + puntosElectricidad + puntosAgua;

        // Cálculo de bonificaciones
        const bonificaciones = {
            empleadosTodos: (poblacion > 0 && desempleados === 0) ? 500 : 0,
            felicidadAlta: (felicidad > 80) ? 300 : 0,
            recursosPositivos: (dinero > 0 && electricidad > 0 && agua > 0) ? 200 : 0,
            poblacionGrande: (poblacion > 1000) ? 1000 : 0
        };
        const totalBonificaciones = Object.values(bonificaciones).reduce((a, b) => a + b, 0);

        // Cálculo de penalizaciones
        const penalizaciones = {
            dineroNegativo: (dinero < 0) ? 500 : 0,
            electricidadNegativa: (electricidad < 0) ? 300 : 0,
            aguaNegativa: (agua < 0) ? 300 : 0,
            felicidadBaja: (poblacion > 0 && felicidad < 40) ? 400 : 0,
            desempleados: (desempleados > 0) ? desempleados * 10 : 0
        };
        const totalPenalizaciones = Object.values(penalizaciones).reduce((a, b) => a + b, 0);

        // Total
        const puntuacionFinal = Math.max(0, Math.round(subtotal + totalBonificaciones - totalPenalizaciones));

        // Desglose completo
        const desglose = {
            puntosPoblacion,
            puntosFelicidad,
            puntosDinero: Math.round(puntosDinero * 100) / 100,
            puntosEdificios,
            puntosElectricidad,
            puntosAgua,
            subtotal: Math.round(subtotal * 100) / 100,
            bonificaciones,
            totalBonificaciones,
            penalizaciones,
            totalPenalizaciones,
            puntuacionFinal
        };

        return desglose;
    }
}