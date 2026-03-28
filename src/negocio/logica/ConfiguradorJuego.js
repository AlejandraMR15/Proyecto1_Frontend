/**
 * CIUDAD VIRTUAL — ConfiguradorJuego.js
 *
 * Responsabilidad única: aplicar cambios de configuración al juego.
 * 
 * Métodos:
 *  - aplicarDuracionTurno(): actualiza duración del turno en SistemaDeTurnos
 *  - aplicarConsumoCiudadanos(): actualiza consumo de ciudadanos en edificios
 *  - aplicarRecursosTotales(): ajusta recursos totales de la ciudad
 *  - aplicarTasaCrecimiento(): actualiza tasa de crecimiento de gestorCiudadanos
 *  - aplicarBeneficioServicio(): actualiza factor beneficio de servicios
 *
 * NO maneja:
 *  - UI (eso es ModalPausa)
 *  - Lógica de juego (eso es Juego)
 *  - Persistencia (eso es StorageManager)
 */

export default class ConfiguradorJuego {
    /**
     * Aplica nueva duración de turno.
     * @param {import('./Juego.js').default} juego
     * @param {number} nuevaDuracionSegundos - segundos
     */
    aplicarDuracionTurno(juego, nuevaDuracionSegundos) {
        if (!juego?.SistemaDeTurnos) return;
        
        const duracionMs = nuevaDuracionSegundos * 1000;
        juego.SistemaDeTurnos.cambiarDuracion(duracionMs);
        console.log(`Duración de turno actualizada: ${nuevaDuracionSegundos}s`);
    }

    /**
     * Aplica nuevo consumo por ciudadano a edificios residenciales.
     * @param {import('../../modelos/ciudad.js').default} ciudad
     * @param {number} electricidad - por ciudadano/turno
     * @param {number} agua - por ciudadano/turno
     * @param {number} comida - por ciudadano/turno
     */
    aplicarConsumoCiudadanos(ciudad, electricidad, agua, comida) {
        if (!ciudad?.construcciones) return;

        ciudad.construcciones.forEach(edificio => {
            // Actualizar residenciales
            if (Array.isArray(edificio.residentes)) {
                edificio.consumoElectricidad = electricidad;
                edificio.consumoAgua = agua;
                edificio.consumoComidaPorResidente = comida;
            }
        });

        console.log(`Consumo de ciudadanos actualizado - Elec: ${electricidad}, Agua: ${agua}, Comida: ${comida}`);
    }

    /**
     * Ajusta recursos totales de la ciudad (diferencial).
     * @param {import('../../modelos/ciudad.js').default} ciudad
     * @param {number} energiaNew - nuevo valor total
     * @param {number} aguaNew - nuevo valor total
     * @param {number} comidaNew - nuevo valor total
     * @param {object} previos - {energia, agua, comida} valores anteriores
     */
    aplicarRecursosTotales(ciudad, energiaNew, aguaNew, comidaNew, previos) {
        if (!ciudad?.recursos) return;

        const deltas = {
            energia: energiaNew - previos.energia,
            agua: aguaNew - previos.agua,
            comida: comidaNew - previos.comida
        };

        if (deltas.energia !== 0) {
            ciudad.recursos.actualizarElectricidad(deltas.energia);
            console.log(`Energía: ${previos.energia} → ${energiaNew} (Δ ${deltas.energia})`);
        }
        if (deltas.agua !== 0) {
            ciudad.recursos.actualizarAgua(deltas.agua);
            console.log(`Agua: ${previos.agua} → ${aguaNew} (Δ ${deltas.agua})`);
        }
        if (deltas.comida !== 0) {
            ciudad.recursos.actualizarComida(deltas.comida);
            console.log(`Comida: ${previos.comida} → ${comidaNew} (Δ ${deltas.comida})`);
        }
    }

    /**
     * Aplica nueva tasa de crecimiento poblacional.
     * @param {import('./GestorCiudadanos.js').default} gestorCiudadanos
     * @param {number} tasaCrecimiento - 1-3
     */
    aplicarTasaCrecimiento(gestorCiudadanos, tasaCrecimiento) {
        if (!gestorCiudadanos) return;
        
        gestorCiudadanos.tasaCrecimiento = tasaCrecimiento;
        console.log(`Tasa de crecimiento actualizada: ${tasaCrecimiento}`);
    }

    /**
     * Aplica nuevo factor de beneficio por servicios.
     * @param {object} config - objeto de configuración compartido
     * @param {number} beneficio - factor de beneficio (1-50)
     */
    aplicarBeneficioServicio(config, beneficio) {
        config.beneficioServicio = beneficio;
        console.log(`Beneficio de servicios actualizado: ${beneficio}`);
    }

    /**
     * Aplica TODOS los cambios de configuración de una vez
     * (método de conveniencia para ModalPausa).
     * 
     * @param {object} opts - opciones
     * @param {import('./Juego.js').default} opts.juego
     * @param {object} opts.config - objeto de configuración
     * @param {object} opts.nuevosValores - valores del formulario {duracion, elec, agua, comida, energia, agua, comida, beneficio, tasa}
     * @param {object} opts.previosRecursos - {energia, agua, comida}
     */
    aplicarTodas(opts) {
        const { juego, config, nuevosValores, previosRecursos } = opts;

        if (!juego) {
            console.error("[ConfiguradorJuego] No hay juego disponible");
            return;
        }

        // Duración del turno
        this.aplicarDuracionTurno(juego, nuevosValores.duracion);

        // Consumo por ciudadanos
        this.aplicarConsumoCiudadanos(
            juego.ciudad,
            nuevosValores.electricidadPorCiudadano,
            nuevosValores.aguaPorCiudadano,
            nuevosValores.comidaPorCiudadano
        );

        // Recursos totales
        this.aplicarRecursosTotales(
            juego.ciudad,
            nuevosValores.energiaTotal,
            nuevosValores.aguaTotal,
            nuevosValores.comidaTotal,
            previosRecursos
        );

        // Tasa de crecimiento
        this.aplicarTasaCrecimiento(juego.gestorCiudadanos, nuevosValores.tasaCrecimiento);

        // Beneficio de servicios
        this.aplicarBeneficioServicio(config, nuevosValores.beneficioServicio);

        console.log("[ConfiguradorJuego] Todas las configuraciones aplicadas");
    }
}
