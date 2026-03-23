/**
 * CIUDAD VIRTUAL — ModalPausa.js
 *
 * Responsabilidad única: gestión de modales del juego.
 *  - Toggle pausa / reanudar
 *  - Modal de configuraciones (leer y aplicar valores)
 *  - Modal de finalizar partida
 *  - Detección y muestra del modal Game Over al cargar
 *  - Cerrar modales al hacer click en el overlay
 *
 * Depende de:
 *  - timerEstado, actualizarTimerDOM (HudPanel.js)
 *  - guardarConMensaje, detenerTimerTurno, detenerAutosave (PartidaManager.js)
 *  - actualizarOAgregarEnRanking (RankingUI.js)
 *  - storage (PartidaManager.js)
 */

import { timerEstado, actualizarTimerDOM, detenerTimerTurno } from './HudPanel.js';
import { detenerAutosave, storage } from './PartidaManager.js';
import { actualizarOAgregarEnRanking } from './RankingUi.js';

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
        if (btnReanudar) btnReanudar.style.display = 'none';
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
    if (btnReanudar) btnReanudar.style.display = '';

    setModal(modalPausa, false);
}

/* ================================================================
   CONFIGURACIONES
================================================================ */

/**
 * Abre el modal de configuraciones con los valores actuales.
 */
function abrirConfig() {
    setModal(modalPausa, false);
    setModal(modalConfig, true);

    document.getElementById('cfg-duracion-turno').value     = timerEstado.duracionTurno;
    document.getElementById('cfg-agua-ciudadano').value     = config.aguaPorCiudadano;
    document.getElementById('cfg-elec-ciudadano').value     = config.electricidadPorCiudadano;
    document.getElementById('cfg-comida-ciudadano').value   = config.comidaPorCiudadano;
    document.getElementById('cfg-beneficio-servicio').value = config.beneficioServicio;
    document.getElementById('cfg-tasa-crecimiento').value   = config.tasaCrecimiento;
}

/**
 * Lee los inputs, aplica los valores y cierra el modal de configuraciones.
 */
function guardarConfig() {
    const juego = window.juego;

    const nuevaDuracion = Math.max(5,
        parseInt(document.getElementById('cfg-duracion-turno').value) || 10);

    config.aguaPorCiudadano         = Math.max(0, parseInt(document.getElementById('cfg-agua-ciudadano').value)      || 0);
    config.electricidadPorCiudadano = Math.max(0, parseInt(document.getElementById('cfg-elec-ciudadano').value)      || 0);
    config.comidaPorCiudadano       = Math.max(0, parseInt(document.getElementById('cfg-comida-ciudadano').value)    || 0);
    config.beneficioServicio        = Math.max(1, parseInt(document.getElementById('cfg-beneficio-servicio').value)  || 10);
    config.tasaCrecimiento          = Math.min(3, Math.max(1,
        parseInt(document.getElementById('cfg-tasa-crecimiento').value) || 3));

    timerEstado.duracionTurno = nuevaDuracion;
    if (juego?.SistemaDeTurnos) {
        juego.SistemaDeTurnos.cambiarDuracion(nuevaDuracion * 1000);
    }
    if (juego?.StorageManager) {
        juego.StorageManager.guardar('config-turno', { duracionTurno: nuevaDuracion });
    }
    if (juego?.gestorCiudadanos) {
        juego.gestorCiudadanos.tasaCrecimiento = config.tasaCrecimiento;
    }

    actualizarTimerDOM();
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

    // Cerrar modales al hacer click en el overlay (excepto modal-pausa)
    [modalPausa, modalConfig, modalFinalizar].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal !== modalPausa) {
                setModal(modal, false);
            }
        });
    });
}