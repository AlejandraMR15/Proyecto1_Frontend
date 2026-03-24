/**
 * CIUDAD VIRTUAL — Hud.js
 *
 * Orquestador del HUD. Importa los módulos especializados,
 * espera a que window.juego esté disponible e inicializa todo.
 *
 * Módulos:
 *  - HudPanel.js       → DOM del HUD, timer visual, sidebar observer
 *  - PartidaManager.js → guardar, autosave, exportar, importar
 *  - RankingUI.js      → ranking (panel lateral + modal game over)
 *  - ModalPausa.js     → pausa, config, finalizar, game over
 *  - AtajosManager.js  → atajos de teclado (HU-024)
 */

import {
    timerEstado,
    actualizarHUD,
    actualizarTimerDOM,
    iniciarTimerTurno,
    detenerTimerTurno,
    onNuevoTurno,
    observarSidebar,
    configurarTooltipsRecursos,
    actualizarTooltipsRecursos,
} from './HudPanel.js';

import {
    guardarConMensaje,
    iniciarAutosave,
    detenerAutosave,
    registrarEventosPartida,
} from './PartidaManager.js';

import {
    cargarRankingDesdeStorage,
    registrarEventosRanking,
} from './RankingUi.js';

import {
    detectarGameOverAlCargar,
    registrarEventosModales,
    irAlMenuDesdeGameOver,
} from './ModalPausa.js';

import { registrarAtajos } from './AtajosManager.js';

/* ================================================================
   INICIALIZACIÓN
================================================================ */

/**
 * Intenta inicializar el HUD. Si window.juego aún no está listo,
 * reintenta hasta 50 veces con 100ms de espera.
 * @param {number} [intentos=0]
 */
function intentarInit(intentos = 0) {
    if (window.juego && window.juego.ciudad) {
        initHUD();
    } else if (intentos < 50) {
        setTimeout(() => intentarInit(intentos + 1), 100);
    } else {
        console.warn('[HUD] No se pudo encontrar window.juego después de 50 intentos.');
    }
}

/**
 * Inicializa el HUD completo una vez que window.juego está listo.
 */
function initHUD() {
    const juego = window.juego;

    /* ----------------------------------------------------------
       1. Restaurar duración del turno desde localStorage
    ---------------------------------------------------------- */
    const configTurnoGuardada = juego.StorageManager.cargar('config-turno');
    if (configTurnoGuardada?.duracionTurno) {
        timerEstado.duracionTurno = configTurnoGuardada.duracionTurno;
        juego.SistemaDeTurnos.cambiarDuracion(timerEstado.duracionTurno * 1000);
        if (configTurnoGuardada.tiempoTranscurrido != null) {
            timerEstado.tiempoTranscurrido = configTurnoGuardada.tiempoTranscurrido;
        }
    } else {
        timerEstado.duracionTurno = Math.round(juego.SistemaDeTurnos.duracion / 1000);
    }

    /* ----------------------------------------------------------
       2. Detectar si la partida cargada estaba en game_over
    ---------------------------------------------------------- */
    const estaEnGameOverAlCargar = detectarGameOverAlCargar();

    /* ----------------------------------------------------------
       3. Cargar ranking guardado
    ---------------------------------------------------------- */
    cargarRankingDesdeStorage();

    /* ----------------------------------------------------------
       4. Pintado inicial del HUD
    ---------------------------------------------------------- */
    actualizarHUD();
    actualizarTimerDOM();
    actualizarTooltipsRecursos();

    /* ----------------------------------------------------------
       5. Interceptar ejecutarTurno para refrescar el HUD
    ---------------------------------------------------------- */
    const ejecutarTurnoOriginal = juego.ejecutarTurno.bind(juego);
    juego.ejecutarTurno = function () {
        ejecutarTurnoOriginal();
        onNuevoTurno();
    };

    /* ----------------------------------------------------------
       6. Interceptar finalizarPartida para persistir game_over
          y detener timer + autosave del HUD
    ---------------------------------------------------------- */
    const finalizarPartidaOriginal = juego.finalizarPartida.bind(juego);
    juego.finalizarPartida = function (razon = 'Desconocida') {
        finalizarPartidaOriginal(razon);
        juego.StorageManager.guardar('estado-juego', { esGameOver: true, razon });
        detenerTimerTurno();
        detenerAutosave();
    };

    /* ----------------------------------------------------------
       7. Registrar todos los eventos de botones
    ---------------------------------------------------------- */
    registrarEventosModales();
    registrarEventosPartida();
    registrarEventosRanking(irAlMenuDesdeGameOver);
    registrarAtajos();

    /* ----------------------------------------------------------
       8. Arrancar juego, timer y autosave
          (solo si NO estamos en game_over al cargar)
    ---------------------------------------------------------- */
    juego.iniciarJuego();

    if (estaEnGameOverAlCargar) {
        detenerTimerTurno();
        console.info('[HUD] Partida en GAME_OVER — timer y autosave no arrancados.');
    } else {
        iniciarTimerTurno();
        iniciarAutosave();
    }

    /* ----------------------------------------------------------
       9. Observar sidebar
    ---------------------------------------------------------- */
    observarSidebar();

    /* ----------------------------------------------------------
       10. Configurar posicionamiento dinámico de tooltips
    ---------------------------------------------------------- */
    configurarTooltipsRecursos();

    console.info('[HUD] Inicializado. Duración turno:', timerEstado.duracionTurno + 's');
}

/* ================================================================
   GLOBALES EXPUESTOS
================================================================ */

// Otros módulos (menuConstruccion, burbujas, etc.) usan estas funciones
window.refrescarHUD   = actualizarHUD;
window.guardarPartida = guardarConMensaje;

/* ================================================================
   ARRANQUE
================================================================ */

document.addEventListener('DOMContentLoaded', () => intentarInit());