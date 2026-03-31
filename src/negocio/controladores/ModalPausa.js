/**
 * CIUDAD VIRTUAL — ModalPausa.js
 *
 * Responsabilidad única: gestión de modales del juego.
 *  - Toggle pausa / reanudar
 *  - Modal de configuraciones (LEER inputs y DELEGAR a ConfiguradorJuego)
 *  - Modal de finalizar partida
 *  - Detección y muestra del modal Game Over al cargar
 *  - Cerrar modales al hacer click en el overlay
 *
 * Depende de:
 *  - timerEstado, actualizarTimerDOM (HudPanel.js)
 *  - guardarConMensaje, detenerTimerTurno, detenerAutosave (PartidaManager.js)
 *  - actualizarOAgregarEnRanking (RankingUI.js)
 *  - storage (PartidaManager.js)
 *  - ConfiguradorJuego (ConfiguradorJuego.js) ← DELEGADO
 */

import { timerEstado, actualizarTimerDOM, detenerTimerTurno } from './HudPanel.js';
import { detenerAutosave, storage } from './PartidaManager.js';
import { actualizarOAgregarEnRanking } from './RankingUi.js';
import ConfiguradorJuego from './ConfiguradorJuego.js';

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

const btnPausa       = document.getElementById('btn-pausa');
const modalPausa     = document.getElementById('modal-pausa');
const modalConfig    = document.getElementById('modal-config');
const modalFinalizar = document.getElementById('modal-finalizar');

/* ================================================================
   UTILIDAD
================================================================ */

/**
 * Muestra u oculta un modal.
 * @param {HTMLElement|null} modal
 * @param {boolean} visible
 */
export function setModal(modal, visible) {
    if (!modal) return;
    modal.dataset.visible = visible ? 'true' : 'false';
}

/* ================================================================
   PAUSA / REANUDAR
================================================================ */

/**
 * Alterna entre pausar y reanudar el juego.
 * En GAME_OVER muestra el modal de pausa con título adaptado.
 */
export function togglePausa() {
    const juego = window.juego;
    if (!juego) return;

    if (juego.EstadoDeJuego.estaJugando()) {
        juego.pausarJuego();
        btnPausa.textContent = '▶';
        btnPausa.classList.add('pausado');
        if (window.movimientoCiudadanos) window.movimientoCiudadanos.detener();
        document.getElementById('viewport')?.classList.add('bloqueado');
        const titulo = modalPausa?.querySelector('.modal-titulo');
        if (titulo) titulo.textContent = '⏸ JUEGO PAUSADO';
        setModal(modalPausa, true);

    } else if (juego.EstadoDeJuego.estaEnPausa()) {
        reanudarJuego();

    } else if (juego.EstadoDeJuego.estadoActual === 'game_over') {
        btnPausa.textContent = '▶';
        btnPausa.classList.add('pausado');
        document.getElementById('viewport')?.classList.add('bloqueado');
        const titulo = modalPausa?.querySelector('.modal-titulo');
        if (titulo) titulo.textContent = '🔴 GAME OVER';
        const btnReanudar = document.getElementById('btn-reanudar');
        if (btnReanudar) btnReanudar.hidden = true;
        setModal(modalPausa, true);
    }
}

/**
 * Reanuda el juego y cierra el modal de pausa.
 */
export function reanudarJuego() {
    const juego = window.juego;
    if (!juego) return;
    if (juego.EstadoDeJuego.estadoActual === 'game_over') return;

    juego.reanudarJuego();
    btnPausa.textContent = '⏸';
    btnPausa.classList.remove('pausado');
    if (window.movimientoCiudadanos) window.movimientoCiudadanos.iniciar();
    document.getElementById('viewport')?.classList.remove('bloqueado');

    const titulo = modalPausa?.querySelector('.modal-titulo');
    if (titulo) titulo.textContent = '⏸ JUEGO PAUSADO';
    const btnReanudar = document.getElementById('btn-reanudar');
    if (btnReanudar) btnReanudar.hidden = false;

    setModal(modalPausa, false);
}

/* ================================================================
   CONFIGURACIONES
================================================================ */

/**
 * Abre el modal de configuraciones con los valores actuales.
 */
function abrirConfig() {
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
function guardarConfig() {
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
   FINALIZAR PARTIDA
================================================================ */

/**
 * Finaliza la partida: registra en ranking, limpia localStorage y vuelve al menú.
 */
export function finalizarPartida() {
    const juego = window.juego;
    if (juego) {
        juego.pausarJuego();
        actualizarOAgregarEnRanking();
        juego.guardarPartida();
    }
    detenerTimerTurno();
    detenerAutosave();
    storage.eliminar('partida');
    storage.eliminar('config-turno');
    storage.eliminar('estado-juego');
    window.location.href = '../vistas/menu.html';
}

/**
 * Limpia localStorage y redirige al menú sin guardar.
 * Usado desde la pantalla de Game Over.
 */
export function irAlMenuDesdeGameOver() {
    detenerTimerTurno();
    detenerAutosave();
    storage.eliminar('partida');
    storage.eliminar('config-turno');
    storage.eliminar('estado-juego');
    window.location.href = '../vistas/menu.html';
}

/* ================================================================
   GAME OVER AL CARGAR
================================================================ */

/**
 * Detecta si la partida guardada estaba en game_over y muestra el modal.
 * Devuelve true si estaba en game_over (para que Hud.js no arranque el timer).
 * @returns {boolean}
 */
export function detectarGameOverAlCargar() {
    const juego = window.juego;
    const estadoPersistido = juego.StorageManager.cargar('estado-juego');
    if (estadoPersistido && estadoPersistido.esGameOver) {
        juego.EstadoDeJuego.cambiarEstado('game_over');
        setTimeout(() => {
            if (window.movimientoCiudadanos) window.movimientoCiudadanos.detener();
            juego._mostrarModalGameOver(estadoPersistido.razon || 'Desconocida');
        }, 300);
        return true;
    }
    return false;
}

/* ================================================================
   REGISTRAR EVENTOS DE BOTONES
================================================================ */

/**
 * Registra todos los listeners de modales de pausa, config, finalizar y game over.
 * Se llama una sola vez desde Hud.js al inicializar.
 */
export function registrarEventosModales() {
    // Botón pausa top-bar
    if (btnPausa) btnPausa.addEventListener('click', togglePausa);

    // Modal pausa
    document.getElementById('btn-reanudar')
        ?.addEventListener('click', reanudarJuego);
    document.getElementById('btn-configuraciones')
        ?.addEventListener('click', abrirConfig);
    document.getElementById('btn-finalizar')
        ?.addEventListener('click', () => {
            setModal(modalPausa, false);
            setModal(modalFinalizar, true);
        });

    // Modal configuraciones
    document.getElementById('btn-cfg-guardar')
        ?.addEventListener('click', guardarConfig);
    document.getElementById('btn-cfg-cancelar')
        ?.addEventListener('click', () => {
            setModal(modalConfig, false);
            setModal(modalPausa, true);
        });

    // Modal finalizar
    document.getElementById('btn-finalizar-confirmar')
        ?.addEventListener('click', finalizarPartida);
    document.getElementById('btn-finalizar-cancelar')
        ?.addEventListener('click', () => {
            setModal(modalFinalizar, false);
            setModal(modalPausa, true);
        });

    // Modal game over → nueva partida
    document.getElementById('btn-game-over-nueva-partida')
        ?.addEventListener('click', irAlMenuDesdeGameOver);

    // Los modales de configuración y finalizar NO se cierran al hacer click en el overlay
    // para mantener el estado de pausa del juego
}