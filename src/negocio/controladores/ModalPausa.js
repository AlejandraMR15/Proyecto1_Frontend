/**
 * CIUDAD VIRTUAL — ModalPausa.js
 *
 * Responsabilidad única: gestión del botón de pausa y el modal de pausa.
 *  - Toggle pausa / reanudar
 *  - Registrar eventos de los modales (pausa, config, finalizar, game over)
 *
 * Depende de:
 *  - timerEstado, actualizarTimerDOM (HudPanel.js)
 *  - GestorConfiguracion (GestorConfiguracion.js) — gestión del modal de config
 *  - PartidaManager (PartidaManager.js) — finalización de partida y game over
 */

import { timerEstado, actualizarTimerDOM, detenerTimerTurno } from './HudPanel.js';
import { detenerAutosave } from './PartidaManager.js';
import { abrirConfig, registrarEventosConfig } from './GestorConfiguracion.js';
import { finalizarPartida, irAlMenuDesdeGameOver, detectarGameOverAlCargar } from './PartidaManager.js';


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
        if (titulo) titulo.textContent = 'JUEGO PAUSADO';
        setModal(modalPausa, true);

    } else if (juego.EstadoDeJuego.estaEnPausa()) {
        reanudarJuego();

    } else if (juego.EstadoDeJuego.estadoActual === 'game_over') {
        btnPausa.textContent = '▶';
        btnPausa.classList.add('pausado');
        document.getElementById('viewport')?.classList.add('bloqueado');
        const titulo = modalPausa?.querySelector('.modal-titulo');
        if (titulo) titulo.textContent = 'GAME OVER';
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
    btnPausa.textContent = '';
    btnPausa.classList.remove('pausado');
    if (window.movimientoCiudadanos) window.movimientoCiudadanos.iniciar();
    document.getElementById('viewport')?.classList.remove('bloqueado');

    const titulo = modalPausa?.querySelector('.modal-titulo');
    if (titulo) titulo.textContent = 'JUEGO PAUSADO';
    const btnReanudar = document.getElementById('btn-reanudar');
    if (btnReanudar) btnReanudar.style.display = '';

    setModal(modalPausa, false);
}



/* ================================================================
   CONFIGURACIONES — DELEGADAS A GestorConfiguracion.js
================================================================ */

// abrirConfig() — importado de GestorConfiguracion.js
// guardarConfig() — importado de GestorConfiguracion.js
// registrarEventosConfig() — importado de GestorConfiguracion.js

/* ================================================================
   FINALIZAR PARTIDA — DELEGADAS A PartidaManager.js
================================================================ */

// finalizarPartida() — importado de PartidaManager.js
// irAlMenuDesdeGameOver() — importado de PartidaManager.js
// detectarGameOverAlCargar() — importado de PartidaManager.js

/* ================================================================
   REGISTRAR EVENTOS DE BOTONES
================================================================ */

/**
 * Registra todos los listeners de modales de pausa y configuración.
 * Se llama una sola vez desde Hud.js al inicializar.
 * 
 * Nota: Los listeners de finalizar y game over están registrados en PartidaManager.js
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

    // Registrar eventos del modal de configuraciones
    registrarEventosConfig();

    // Los modales de configuración y finalizar NO se cierran al hacer click en el overlay
    // para mantener el estado de pausa del juego
}
