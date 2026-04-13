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

const REGLAS_CONFIG = [
    {
        inputId: 'cfg-duracion-turno',
        errorId: 'cfg-duracion-error',
        min: 10,
        max: 300,
        mensaje: 'La duración debe estar entre 10 y 300 segundos'
    },
    {
        inputId: 'cfg-agua-ciudadano',
        errorId: 'cfg-agua-ciudadano-error',
        min: 0,
        max: 50,
        mensaje: 'El consumo de agua debe estar entre 0 y 50'
    },
    {
        inputId: 'cfg-elec-ciudadano',
        errorId: 'cfg-elec-ciudadano-error',
        min: 0,
        max: 50,
        mensaje: 'El consumo de electricidad debe estar entre 0 y 50'
    },
    {
        inputId: 'cfg-comida-ciudadano',
        errorId: 'cfg-comida-ciudadano-error',
        min: 0,
        max: 50,
        mensaje: 'El consumo de comida debe estar entre 0 y 50'
    },
    {
        inputId: 'cfg-energia-total',
        errorId: 'cfg-energia-total-error',
        min: 0,
        max: 999999,
        mensaje: 'La energia total debe estar entre 0 y 999999'
    },
    {
        inputId: 'cfg-agua-total',
        errorId: 'cfg-agua-total-error',
        min: 0,
        max: 999999,
        mensaje: 'El agua total debe estar entre 0 y 999999'
    },
    {
        inputId: 'cfg-comida-total',
        errorId: 'cfg-comida-total-error',
        min: 0,
        max: 999999,
        mensaje: 'La comida total debe estar entre 0 y 999999'
    },
    {
        inputId: 'cfg-beneficio-servicio',
        errorId: 'cfg-beneficio-servicio-error',
        min: 1,
        max: 50,
        mensaje: 'El beneficio de servicio debe estar entre 1 y 50'
    },
    {
        inputId: 'cfg-tasa-crecimiento',
        errorId: 'cfg-tasa-crecimiento-error',
        min: 1,
        max: 3,
        mensaje: 'La tasa debe estar entre 1 y 3'
    }
];

function limpiarErroresConfig() {
    REGLAS_CONFIG.forEach(({ errorId }) => {
        const errorEl = document.getElementById(errorId);
        if (!errorEl) return;
        errorEl.textContent = '';
        errorEl.classList.add('oculto');
    });
}

function validarCamposConfig() {
    const valores = {};
    let hayErrores = false;

    REGLAS_CONFIG.forEach(({ inputId, errorId, min, max, mensaje }) => {
        const inputEl = document.getElementById(inputId);
        const errorEl = document.getElementById(errorId);
        if (!inputEl || !errorEl) return;

        const valor = Number.parseInt(inputEl.value, 10);
        const esValido = Number.isInteger(valor) && valor >= min && valor <= max;

        if (!esValido) {
            errorEl.textContent = `⚠ ${mensaje}`;
            errorEl.classList.remove('oculto');
            hayErrores = true;
            return;
        }

        errorEl.textContent = '';
        errorEl.classList.add('oculto');
        valores[inputId] = valor;
    });

    return {
        hayErrores,
        valores
    };
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

    limpiarErroresConfig();
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

    const { hayErrores, valores } = validarCamposConfig();
    if (hayErrores) {
        return;
    }

    // ===== LEER DEL DOM (solo valores validados) =====
    const nuevaDuracion = valores['cfg-duracion-turno'];
    const aguaPorCiudadano = valores['cfg-agua-ciudadano'];
    const electricidadPorCiudadano = valores['cfg-elec-ciudadano'];
    const comidaPorCiudadano = valores['cfg-comida-ciudadano'];
    const energiaTotal = valores['cfg-energia-total'];
    const aguaTotal = valores['cfg-agua-total'];
    const comidaTotal = valores['cfg-comida-total'];
    const beneficioServicio = valores['cfg-beneficio-servicio'];
    const tasaCrecimiento = valores['cfg-tasa-crecimiento'];

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
