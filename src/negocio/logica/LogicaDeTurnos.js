import PlantasDeUtilidad from '../../modelos/construccion/tiposEdificios/plantasUtilidad.js';

/**
 * Encapsula toda la lógica de cálculo de recursos por turno.
 * 
 * Responsable de:
 * - Procesar un turno completo: producción y consumos.
 * - Calcular recursos iniciales al cargar una ciudad.
 */
export default class LogicaDeTurnos {
    /**
     * Ejecuta un ciclo de turno completo:
     * 1. Primero las plantas de utilidad producen recursos.
     * 2. Luego otros edificios producen recursos.
     * 3. Finalmente todos los edificios aplican sus consumos.
     * 
     * @param {Ciudad} ciudad - Instancia de la ciudad a procesar.
     * @param {Ciudadano[]} [ciudadanos=[]] - Array con todos los ciudadanos de la ciudad.
     * @param {function} [onVisualizarProduccion] - Callback opcional: (edificio, produccion) => void.
     *                   Se llama para cada edificio tras calcular su producción.
     *                   Permite mostrar visualizaciones sin acoplar Ciudad con la presentación.
     * @returns {object} Producción total del turno.
     */
    procesarTurno(ciudad, ciudadanos = [], onVisualizarProduccion = null) {
        const produccionPendiente = {
            dinero: 0,
            electricidad: 0,
            agua: 0,
            felicidad: ciudad.obtenerValorServicios(),
            comida: 0,
        };

        // Guardar producción total de plantas (FASE 1)
        let produccionPlantasElectricidad = 0;
        let produccionPlantasAgua = 0;

        // ===== FASE 1: PRODUCCIÓN de plantas de utilidad =====
        const plantas = ciudad.construcciones.filter(c => c instanceof PlantasDeUtilidad);
        for (const planta of plantas) {
            const produccion = planta.procesarProduccion(ciudad.recursos);
            this._acumularProduccionPendiente(produccionPendiente, produccion);
            
            // Guardar producción de plantas para retornar después
            if (produccion?.electricidad) produccionPlantasElectricidad += produccion.electricidad;
            if (produccion?.agua) produccionPlantasAgua += produccion.agua;
            
            // Invocar callback para visualización (si fue proporcionado)
            if (onVisualizarProduccion) {
                onVisualizarProduccion(planta, produccion);
            }
        }

        // Aplicar producción de plantas inmediatamente (la planta de agua la necesita)
        if (produccionPendiente.electricidad > 0) {
            ciudad.recursos.actualizarElectricidad(produccionPendiente.electricidad);
        }
        if (produccionPendiente.agua > 0) {
            ciudad.recursos.actualizarAgua(produccionPendiente.agua);
        }

        // Reset para siguiente fase
        produccionPendiente.dinero = 0;
        produccionPendiente.electricidad = 0;
        produccionPendiente.agua = 0;
        produccionPendiente.comida = 0;

        // ===== FASE 2: PRODUCCIÓN de otros edificios =====
        const otrosEdificios = ciudad.construcciones.filter(c => !(c instanceof PlantasDeUtilidad));
        for (const edificio of otrosEdificios) {
            if (typeof edificio.procesarProduccion === 'function') {
                const produccion = edificio.procesarProduccion(ciudad.recursos);
                this._acumularProduccionPendiente(produccionPendiente, produccion);
                
                // Invocar callback para visualización (si fue proporcionado)
                if (onVisualizarProduccion) {
                    onVisualizarProduccion(edificio, produccion);
                }
            }
        }

        // Aplicar producción de otros edificios
        if (produccionPendiente.dinero > 0) {
            ciudad.recursos.dinero += produccionPendiente.dinero;
        }
        if (produccionPendiente.comida > 0) {
            ciudad.recursos.actualizarComida(produccionPendiente.comida);
        }

        // ===== FASE 3: CONSUMOS de todos los edificios =====
        for (const edificio of ciudad.construcciones) {
            if (typeof edificio.procesarConsumo === 'function') {
                edificio.procesarConsumo(ciudad.recursos);
            }
        }

        return {
            dinero: produccionPendiente.dinero,
            electricidad: produccionPlantasElectricidad,
            agua: produccionPlantasAgua,
            felicidad: produccionPendiente.felicidad,
        };
    }

    /**
     * Calcula recursos iniciales basándose en los edificios del mapa cargado.
     * 
     * Fases:
     * 1. Producción de plantas de utilidad (electricidad, agua)
     * 2. Producción de otros edificios (dinero, comida)
     * 3. Consumos de todos los edificios
     * 
     * @param {Ciudad} ciudad - Instancia de la ciudad a procesar.
     * @returns {void}
     */
    calcularRecursosIniciales(ciudad) {
        const produccionPendiente = {
            dinero: 0,
            electricidad: 0,
            agua: 0,
            comida: 0,
        };

        // FASE 1: Producción de plantas de utilidad (electricidad, agua)
        const plantas = ciudad.construcciones.filter(c => c instanceof PlantasDeUtilidad);
        for (const planta of plantas) {
            if (typeof planta.procesarProduccion === 'function') {
                const produccion = planta.procesarProduccion(ciudad.recursos);
                this._acumularProduccionPendiente(produccionPendiente, produccion);
            }
        }

        // Aplicar producción de plantas
        if (produccionPendiente.electricidad > 0) {
            ciudad.recursos.actualizarElectricidad(produccionPendiente.electricidad);
        }
        if (produccionPendiente.agua > 0) {
            ciudad.recursos.actualizarAgua(produccionPendiente.agua);
        }

        // Reset para siguiente fase
        produccionPendiente.dinero = 0;
        produccionPendiente.electricidad = 0;
        produccionPendiente.agua = 0;
        produccionPendiente.comida = 0;

        // FASE 2: Producción de otros edificios (dinero, comida)
        const otrosEdificios = ciudad.construcciones.filter(c => !(c instanceof PlantasDeUtilidad));
        for (const edificio of otrosEdificios) {
            if (typeof edificio.procesarProduccion === 'function') {
                const produccion = edificio.procesarProduccion(ciudad.recursos);
                this._acumularProduccionPendiente(produccionPendiente, produccion);
            }
        }

        // Aplicar producción de otros edificios
        if (produccionPendiente.dinero > 0) {
            ciudad.recursos.dinero += produccionPendiente.dinero;
        }
        if (produccionPendiente.comida > 0) {
            ciudad.recursos.actualizarComida(produccionPendiente.comida);
        }

        // FASE 3: Consumos de todos los edificios (mantenimiento, electricidad, agua, comida)
        for (const edificio of ciudad.construcciones) {
            if (typeof edificio.procesarConsumo === 'function') {
                edificio.procesarConsumo(ciudad.recursos);
            }
        }
    }

    /**
     * Acumula los recursos producidos en el turno para recolección por burbujas.
     * @private
     * @param {object} acumulado
     * @param {object|null|undefined} produccion
     */
    _acumularProduccionPendiente(acumulado, produccion) {
        if (!produccion || typeof produccion !== 'object') return;

        for (const tipo of ['dinero', 'electricidad', 'agua', 'comida']) {
            const valor = Number(produccion[tipo]);
            if (Number.isFinite(valor) && valor > 0) {
                acumulado[tipo] += valor;
            }
        }
    }
}
