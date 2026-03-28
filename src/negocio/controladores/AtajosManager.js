/**
 * CIUDAD VIRTUAL — AtajosManager.js
 *
 * Responsabilidad única: atajos de teclado (HU-024).
 *  - ESC  → cerrar modal abierto / no actúa en game over
 *  - Space → pausar / reanudar
 *  - B    → abrir menú de construcción
 *  - R    → modo construcción de vías
 *  - D    → modo demolición
 *  - S    → guardar partida
 *
 * Depende de:
 *  - togglePausa, setModal (ModalPausa.js)
 *  - guardarConMensaje (PartidaManager.js)
 */

import { togglePausa, setModal } from './ModalPausa.js';
import { guardarConMensaje } from './PartidaManager.js';

/* ================================================================
   REGISTRAR EVENTOS
================================================================ */

/**
 * Registra los dos listeners globales de teclado.
 * Se llama una sola vez desde Hud.js al inicializar.
 */
export function registrarAtajos() {
    document.addEventListener('keydown', _onEscape);
    document.addEventListener('keydown', _onAtajos);
}

/* ================================================================
   HANDLERS PRIVADOS
================================================================ */

/**
 * ESC: cierra el modal activo (excepto game over, que requiere elección explícita).
 */
function _onEscape(e) {
    if (e.code !== 'Escape') return;
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();

    const modalGameOver    = document.getElementById('modal-game-over');
    const modalRankingGO   = document.getElementById('modal-ranking-gameover');
    const modalConfig      = document.getElementById('modal-config');
    const modalFinalizar   = document.getElementById('modal-finalizar');
    const modalPausa       = document.getElementById('modal-pausa');
    const modalImportar    = document.getElementById('modal-importar');
    const panelRanking     = document.getElementById('panel-ranking');
    const climaInfobox     = document.getElementById('clima-infobox');

    // Game over activo → no hacer nada
    if (modalGameOver?.dataset.visible === 'true') return;

    // Ranking game over activo → cerrar y volver a game over
    if (modalRankingGO?.dataset.visible === 'true') {
        modalRankingGO.dataset.visible = 'false';
        if (modalGameOver) modalGameOver.dataset.visible = 'true';
        return;
    }

    // Clima abierto → cerrar usando el botón
    if (climaInfobox?.dataset.visible === 'true') {
        document.getElementById('widget-clima-btn')?.click();
        return;
    }

    // Modal importar activo → cerrar y volver a pausa
    if (modalImportar?.dataset.visible === 'true') {
        setModal(modalImportar, false);
        setModal(modalPausa, true);
        return;
    }

    // Config activo → cerrar y volver a pausa
    if (modalConfig?.dataset.visible === 'true') {
        setModal(modalConfig, false);
        setModal(modalPausa, true);
        return;
    }

    // Finalizar activo → cerrar y volver a pausa
    if (modalFinalizar?.dataset.visible === 'true') {
        setModal(modalFinalizar, false);
        setModal(modalPausa, true);
        return;
    }

    // Modal pausa activo → cerrar (sin reanudar, Space lo hace)
    if (modalPausa?.dataset.visible === 'true') {
        setModal(modalPausa, false);
        return;
    }

    // Panel ranking lateral activo → cerrar
    if (panelRanking?.dataset.open === 'true') {
        panelRanking.dataset.open = 'false';
        document.body.classList.remove('panel-ranking-abierto');
    }
}

/**
 * Atajos de acción: Space, B, R, D, S.
 */
function _onAtajos(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const modalPausa     = document.getElementById('modal-pausa');
    const modalConfig    = document.getElementById('modal-config');
    const modalFinalizar = document.getElementById('modal-finalizar');
    const modalGameOver  = document.getElementById('modal-game-over');

    const hayModalVisible = [modalPausa, modalConfig, modalFinalizar].some(
        m => m?.dataset.visible === 'true'
    );
    const hayGameOver = modalGameOver?.dataset.visible === 'true';

    // Space puede actuar aunque el modal de pausa esté abierto (para reanudar)
    if (e.code !== 'Space') {
        if (hayModalVisible || hayGameOver) return;
    } else {
        // Space bloqueado si config, finalizar o game over están abiertos
        const hayOtroModal = [modalConfig, modalFinalizar].some(
            m => m?.dataset.visible === 'true'
        );
        if (hayOtroModal || hayGameOver) return;
    }

    const juego = window.juego;

    switch (e.code) {

        // B → Abrir / cerrar menú de construcción
        case 'KeyB': {
            e.preventDefault();
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                const abierto = sidebar.dataset.open === 'true';
                if (abierto) {
                    document.getElementById('sidebarClose')?.click();
                } else {
                    document.getElementById('sidebarTab')?.click();
                }
            }
            break;
        }

        // R → Toggle modo construcción de vías
        case 'KeyR': {
            e.preventDefault();
            const sidebar = document.getElementById('sidebar');
            
            if (sidebar.dataset.open === 'true') {
                // Sidebar abierto → cerrar
                document.getElementById('sidebarClose')?.click();
            } else {
                // Sidebar cerrado → abrir y seleccionar vía
                document.getElementById('sidebarTab')?.click();
                setTimeout(() => {
                    document.querySelector('.build-item[data-id="via-001"]')?.click();
                }, 50);
            }
            break;
        }

        // D → Activar / desactivar modo demolición
        case 'KeyD': {
            e.preventDefault();
            document.getElementById('btnDemolicion')?.click();
            break;
        }

        // Space → Pausar / Reanudar
        case 'Space': {
            e.preventDefault();
            if (!juego) break;
            togglePausa();
            break;
        }

        // S → Guardar partida
        case 'KeyS': {
            e.preventDefault();
            if (juego?.ciudad) guardarConMensaje();
            break;
        }
    }
}