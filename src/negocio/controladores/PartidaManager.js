/**
 * CIUDAD VIRTUAL — PartidaManager.js
 *
 * Responsabilidad única: persistencia de la partida.
 *  - Guardar partida manualmente con mensaje visual
 *  - Autosave cada 30 segundos
 *  - Exportar ciudad a JSON descargable (HU-021)
 *  - Importar ciudad desde archivo JSON (HU-021)
 *  - Finalizar partida: registra en ranking, limpia localStorage y vuelve al menú
 *  - Ir al menú desde Game Over sin guardar
 *  - Detectar si la partida cargada estaba en game_over
 *
 * Depende de:
 *  - timerEstado  (HudPanel.js) — para persistir duración del turno
 *  - detenerTimerTurno / detenerAutosave (propios o importados)
 *  - StorageManager (acceso_datos)
 *  - actualizarOAgregarEnRanking (RankingUI.js)
 */

import StorageManager from '../../acceso_datos/StorageManager.js';
import { leerPartidaDesdeArchivoJSON } from '../../acceso_datos/ImportadorCiudad.js';
import { timerEstado, detenerTimerTurno } from './HudPanel.js';
import { actualizarOAgregarEnRanking } from './RankingUi.js';
import { reiniciarHistorialRecursos } from './historialRecursos.js';

export const storage = new StorageManager();

/* ================================================================
   ESTADO AUTOSAVE
================================================================ */

let _autosaveIntervalo = null;

/* ================================================================
   UTILIDAD MODAL
================================================================ */

/**
 * Muestra u oculta un elemento modal por data-visible.
 * @param {HTMLElement|null} modal
 * @param {boolean} visible
 */
function setModal(modal, visible) {
    if (!modal) return;
    modal.dataset.visible = visible ? 'true' : 'false';
}

/* ================================================================
   GUARDAR PARTIDA
================================================================ */

/**
 * Muestra el indicador "Guardando…", guarda la partida en localStorage
 * y luego cambia a "¡Guardado!" por 2 segundos.
 */
export function guardarConMensaje() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const el  = document.getElementById('hud-guardando');
    const txt = document.getElementById('guardando-texto');
    if (!el || !txt) return;

    el.classList.remove('guardado');
    txt.textContent = 'Guardando...';
    el.dataset.visible = 'true';

    // Persistir duración del turno y tiempo transcurrido
    juego.StorageManager.guardar('config-turno', {
        duracionTurno:      timerEstado.duracionTurno,
        tiempoTranscurrido: timerEstado.tiempoTranscurrido,
    });

    juego.guardarPartida();

    setTimeout(() => {
        el.classList.add('guardado');
        txt.textContent = '¡Guardado!';
        setTimeout(() => {
            el.dataset.visible = 'false';
            el.classList.remove('guardado');
        }, 2000);
    }, 600);
}

/* ================================================================
   AUTOSAVE
================================================================ */

/**
 * Inicia el autosave cada 30 segundos (solo cuando el juego está activo).
 */
export function iniciarAutosave() {
    if (_autosaveIntervalo !== null) return;
    _autosaveIntervalo = setInterval(() => {
        if (window.juego?.EstadoDeJuego?.estaJugando()) {
            guardarConMensaje();
        }
    }, 30000);
}

/**
 * Detiene el autosave.
 */
export function detenerAutosave() {
    if (_autosaveIntervalo !== null) {
        clearInterval(_autosaveIntervalo);
        _autosaveIntervalo = null;
    }
}

/* ================================================================
   EXPORTAR CIUDAD (HU-021)
================================================================ */

/**
 * Genera y descarga un archivo JSON con el estado completo de la ciudad.
 * Nombre: ciudad_{nombre}_{fecha}.json
 * Cierra el modal de pausa si está abierto.
 */
export function exportarCiudad() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const ciudad   = juego.ciudad;
    const recursos = ciudad.recursos;
    const gestor   = juego.gestorCiudadanos;
    const mapa     = ciudad.mapa;

    const exportData = {
        cityName:    ciudad.nombre,
        mayor:       ciudad.alcalde,
        gridSize:    { width: mapa.ancho, height: mapa.alto },
        coordinates: ciudad.coordenadas ?? null,
        turn:        juego.numeroTurno,
        score:       juego.puntaje || 0,
        map:         mapa.toJSON ? mapa.toJSON() : mapa,
        buildings:   ciudad.construcciones.map(c => c.toJSON ? c.toJSON() : c),
        roads:       ciudad.construcciones
                        .filter(c => c.constructor?.name === 'Vias')
                        .map(c => c.toJSON ? c.toJSON() : c),
        resources: {
            dinero:       recursos.dinero,
            electricidad: recursos.electricidad,
            agua:         recursos.agua,
            comida:       recursos.comida,
        },
        citizens:   gestor.ciudadanos.map(c => c.toJSON ? c.toJSON() : c),
        population: gestor.calcularTotalCiudadanos(),
        happiness:  Math.round(gestor.calcularFelicidadPromedio()),
    };

    const json   = JSON.stringify(exportData, null, 2);
    const blob   = new Blob([json], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    const fecha  = new Date().toISOString().slice(0, 10);
    a.href       = url;
    a.download   = `ciudad_${ciudad.nombre.replace(/\s+/g, '_')}_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Notificación de éxito
    const el  = document.getElementById('hud-guardando');
    const txt = document.getElementById('guardando-texto');
    if (el && txt) {
        el.classList.remove('guardado');
        txt.textContent = 'Ciudad exportada ✔';
        el.dataset.visible = 'true';
        setTimeout(() => {
            el.classList.add('guardado');
            setTimeout(() => {
                el.dataset.visible = 'false';
                el.classList.remove('guardado');
            }, 2000);
        }, 100);
    }

    // NO cerrar modal de pausa al exportar
}

/* ================================================================
   IMPORTAR CIUDAD (HU-021)
================================================================ */

/**
 * Abre el modal de confirmación de importar ciudad.
 */
export function abrirModalImportar() {
    // El mensaje de error permanece oculto hasta que ocurra un error real
    setModal(document.getElementById('modal-pausa'), false);
    setModal(document.getElementById('modal-importar'), true);
}

/**
 * Procesa el archivo JSON seleccionado e importa la ciudad.
 * La partida actual se PIERDE (el usuario fue advertido en el modal).
 * @param {File} archivo
 */
export async function procesarArchivoImportacion(archivo) {
    try {
        const partida = await leerPartidaDesdeArchivoJSON(archivo);
        const juego = window.juego;

        // Detener todo antes de reemplazar
        if (juego) juego.SistemaDeTurnos.detener();
        detenerTimerTurno();
        detenerAutosave();
        if (window.movimientoCiudadanos) window.movimientoCiudadanos.detener();

        // Persistir y recargar limpio
        if (juego) {
            juego.StorageManager.guardar('partida', partida);
            juego.StorageManager.guardar('config-turno', {
                duracionTurno: timerEstado.duracionTurno,
            });
            juego.StorageManager.eliminar('estado-juego');
        }
        reiniciarHistorialRecursos();
        storage.guardar('accion-inicio', 'continuar');

        setModal(document.getElementById('modal-importar'), false);
        window.location.reload();

    } catch (err) {
        const aviso = document.getElementById('importar-aviso-error');
        const texto = document.getElementById('importar-error-texto');
        if (aviso && texto) {
            texto.textContent = 'Error: ' + err.message;
            aviso.dataset.visible = 'true';
        }
        console.error('[PartidaManager] Error al importar ciudad:', err);
    }
}

/* ================================================================
   MOSTRAR MODAL GAME OVER
================================================================ */

/**
 * Muestra el modal de GAME OVER con la razón, número de turno y puntuación.
 *
 * @param {string} razon - Razón del game over
 * @param {number} numeroTurno - Número del turno en que terminó
 * @param {number} puntaje - Puntuación final
 */
export function mostrarModalGameOver(razon, numeroTurno, puntaje) {
    const modalGameOver = document.getElementById('modal-game-over');
    if (!modalGameOver) return;

    // Actualizar contenido del modal
    const elRazon = document.getElementById('modal-game-over-razon');
    const elTurno = document.getElementById('modal-game-over-turno');
    const elScore = document.getElementById('modal-game-over-score');

    if (elRazon) {
        const razones = {
            'Sin dinero': '💰 Te has quedado sin dinero',
            'Sin electricidad': '⚡ Te has quedado sin electricidad',
            'Sin agua': '💧 Te has quedado sin agua'
        };
        elRazon.textContent = razones[razon] || razon;
    }
    if (elTurno) elTurno.textContent = numeroTurno;
    if (elScore) elScore.textContent = puntaje || 0;

    // Mostrar modal
    modalGameOver.dataset.visible = 'true';
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
            mostrarModalGameOver(estadoPersistido.razon || 'Desconocida', estadoPersistido.numeroTurno || 0, estadoPersistido.puntaje || 0);
        }, 300);
        return true;
    }
    return false;
}

/* ================================================================
   REGISTRAR EVENTOS DE BOTONES
================================================================ */

/**
 * Registra todos los listeners relacionados con persistencia de partida.
 * Se llama una sola vez desde Hud.js al inicializar.
 */
export function registrarEventosPartida() {
    document.getElementById('btn-guardar-partida')
        ?.addEventListener('click', guardarConMensaje);

    document.getElementById('btn-exportar-ciudad')
        ?.addEventListener('click', exportarCiudad);

    document.getElementById('btn-importar-ciudad')
        ?.addEventListener('click', abrirModalImportar);

    // Modal importar
    document.getElementById('btn-importar-confirmar')
        ?.addEventListener('click', () => {
            document.getElementById('input-importar-ciudad')?.click();
        });

    document.getElementById('btn-importar-cancelar')
        ?.addEventListener('click', () => {
            setModal(document.getElementById('modal-importar'), false);
            setModal(document.getElementById('modal-pausa'), true);
        });

    document.getElementById('input-importar-ciudad')
        ?.addEventListener('change', (e) => {
            const archivo = e.target.files?.[0];
            if (archivo) procesarArchivoImportacion(archivo);
            e.target.value = '';
        });

    // Modal finalizar
    document.getElementById('btn-finalizar-confirmar')
        ?.addEventListener('click', finalizarPartida);
    document.getElementById('btn-finalizar-cancelar')
        ?.addEventListener('click', () => {
            setModal(document.getElementById('modal-finalizar'), false);
            setModal(document.getElementById('modal-pausa'), true);
        });

    // Modal game over → nueva partida
    document.getElementById('btn-game-over-nueva-partida')
        ?.addEventListener('click', irAlMenuDesdeGameOver);
}
