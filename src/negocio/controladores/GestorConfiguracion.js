/**
 * CIUDAD VIRTUAL — GestorConfiguracion.js
 *
 * Responsabilidad única: gestión del modal de configuraciones del juego.
 *  - Estado interno de configuración
 *  - Abrir modal de configuraciones
 *  - Guardar configuraciones (leer inputs, delegar a ConfiguradorJuego)
 *  - Registrar eventos del modal de configuraciones
 *
 * Depende de:
 *  - timerEstado, actualizarTimerDOM (HudPanel.js)
 *  - ConfiguradorJuego (ConfiguradorJuego.js)
 */

import { timerEstado } from './HudPanel.js';
import ConfiguradorJuego from '../logica/ConfiguradorJuego.js';

/* ================================================================
   ESTADO INTERNO DE CONFIGURACIÓN
================================================================ */

/** Configuración mutable durante la partida */
export const config = {
    aguaPorCiudadano:         1,
    electricidadPorCiudadano: 1,
    comidaPorCiudadano:       1,
    beneficioServicio:        10,
    tasaCrecimiento:          3,
    energiaActual:            0,
    aguaActual:               0,
    comidaActual:             0,
};

/* ================================================================
   REFERENCIAS DOM
================================================================ */

const modalPausa   = document.getElementById('modal-pausa');
const modalConfig  = document.getElementById('modal-config');

/* ================================================================
   UTILIDAD
================================================================ */

/**
 * Muestra u oculta un modal.
 * @param {HTMLElement|null} modal
 * @param {boolean} visible
 */
function setModal(modal, visible) {
    if (!modal) return;
    modal.dataset.visible = visible ? 'true' : 'false';
}

/* ================================================================
   CONFIGURACIONES
================================================================ */

/**
 * Abre el modal de configuraciones con los valores actuales.
 */
export function abrirConfig() {
    const juego = window.juego;
    
    setModal(modalPausa, false);
    setModal(modalConfig, true);

    // Cargar valores actuales de consumo por ciudadano
    document.getElementById('cfg-duracion-turno').value     = timerEstado.duracionTurno;
    document.getElementById('cfg-agua-ciudadano').value     = config.aguaPorCiudadano;
    document.getElementById('cfg-elec-ciudadano').value     = config.electricidadPorCiudadano;
    document.getElementById('cfg-comida-ciudadano').value   = config.comidaPorCiudadano;
    document.getElementById('cfg-beneficio-servicio').value = config.beneficioServicio;
    document.getElementById('cfg-tasa-crecimiento').value   = config.tasaCrecimiento;
    
    // Cargar valores actuales de recursos totales desde la ciudad
    if (juego?.ciudad?.recursos) {
        config.energiaActual = juego.ciudad.recursos.electricidad;
        config.aguaActual = juego.ciudad.recursos.agua;
        config.comidaActual = juego.ciudad.recursos.comida;
        
        document.getElementById('cfg-energia-total').value = config.energiaActual;
        document.getElementById('cfg-agua-total').value = config.aguaActual;
        document.getElementById('cfg-comida-total').value = config.comidaActual;
    }
}

/**
 * Lee los inputs, delega al ConfiguradorJuego, y cierra el modal de configuraciones.
 */
export function guardarConfig() {
    const juego = window.juego;
    if (!juego) {
        console.error("No hay juego disponible");
        return;
    }

    // ===== LEER DEL DOM =====
    const nuevaDuracion = Math.max(5,
        parseInt(document.getElementById('cfg-duracion-turno').value) || 10);
    const electricidadPorCiudadano = Math.max(0, parseInt(document.getElementById('cfg-elec-ciudadano').value) || 0);
    const aguaPorCiudadano = Math.max(0, parseInt(document.getElementById('cfg-agua-ciudadano').value) || 0);
    const comidaPorCiudadano = Math.max(0, parseInt(document.getElementById('cfg-comida-ciudadano').value) || 0);
    const beneficioServicio = Math.max(1, parseInt(document.getElementById('cfg-beneficio-servicio').value) || 10);
    const tasaCrecimiento = Math.min(3, Math.max(1, parseInt(document.getElementById('cfg-tasa-crecimiento').value) || 3));
    const energiaTotal = Math.max(0, parseInt(document.getElementById('cfg-energia-total').value) || 0);
    const aguaTotal = Math.max(0, parseInt(document.getElementById('cfg-agua-total').value) || 0);
    const comidaTotal = Math.max(0, parseInt(document.getElementById('cfg-comida-total').value) || 0);

    // ===== ACTUALIZAR OBJETO CONFIG Local =====
    config.electricidadPorCiudadano = electricidadPorCiudadano;
    config.aguaPorCiudadano = aguaPorCiudadano;
    config.comidaPorCiudadano = comidaPorCiudadano;
    config.beneficioServicio = beneficioServicio;
    config.tasaCrecimiento = tasaCrecimiento;

    // ===== DELEGAR AL CONFIGURADOR =====
    const configurador = new ConfiguradorJuego();
    configurador.aplicarTodas({
        juego,
        config,
        nuevosValores: {
            duracion: nuevaDuracion,
            electricidadPorCiudadano,
            aguaPorCiudadano,
            comidaPorCiudadano,
            energiaTotal,
            aguaTotal,
            comidaTotal,
            beneficioServicio,
            tasaCrecimiento
        },
        previosRecursos: {
            energia: config.energiaActual,
            agua: config.aguaActual,
            comida: config.comidaActual
        }
    });

    // ===== GUARDAR NUEVOS VALORES EN CONFIG =====
    config.energiaActual = energiaTotal;
    config.aguaActual = aguaTotal;
    config.comidaActual = comidaTotal;

    // ===== ACTUALIZAR UI (responsabilidad de ModalPausa) =====
    timerEstado.duracionTurno = nuevaDuracion;
    if (juego?.StorageManager) {
        juego.StorageManager.guardar('config-turno', { duracionTurno: nuevaDuracion });
    }

    // ===== CERRAR MODAL =====
    setModal(modalConfig, false);
    setModal(modalPausa, true);
}

/* ================================================================
   REGISTRAR EVENTOS DE BOTONES
================================================================ */

/**
 * Registra todos los listeners del modal de configuraciones.
 * Se llama desde ModalPausa.js en registrarEventosModales().
 */
export function registrarEventosConfig() {
    document.getElementById('btn-cfg-guardar')
        ?.addEventListener('click', guardarConfig);
    document.getElementById('btn-cfg-cancelar')
        ?.addEventListener('click', () => {
            setModal(modalConfig, false);
            setModal(modalPausa, true);
        });
}
